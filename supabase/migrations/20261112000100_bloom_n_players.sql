-- 20261112000100_bloom_n_players.sql
-- Additive migration & RPC security hardening for Bloom N multi-realm adventure.
-- Enforces closed RLS tables, bcrypt 4-digit PIN hashing, VOLATILE rate-limited RPCs,
-- wildcard-escaped search, deep monotonic node/realm JSONB merges, and household wonders.

create table if not exists public.bloomn_players (
  username     text primary key,
  display_name text,
  avatar       text,
  family_code  text,
  progress     jsonb not null default '{}'::jsonb,
  fun          jsonb not null default '{}'::jsonb,
  pin          text,
  updated_at   timestamptz not null default now()
);

create index if not exists bloomn_players_family_idx on public.bloomn_players (family_code);

alter table public.bloomn_players enable row level security;
revoke all on table public.bloomn_players from anon, authenticated;

drop trigger if exists yomple_hash_pin on public.bloomn_players;
create trigger yomple_hash_pin
  before insert or update on public.bloomn_players
  for each row execute function public.yomple_hash_pin();

-- Shared household co-op monument (Great Northern Observatory) + orthogonal hero titles
create table if not exists public.bloomn_household_wonders (
  family_code      text primary key,
  total_flux       bigint not null default 0,
  observatory_tier int not null default 1,
  constellations   jsonb not null default '[]'::jsonb,
  heroes           jsonb not null default '{}'::jsonb,
  updated_at       timestamptz not null default now()
);

alter table public.bloomn_household_wonders enable row level security;
revoke all on table public.bloomn_household_wonders from anon, authenticated;

-- Register bloomn_players in Yomple's table whitelist
create or replace function public.yomple_tbl(p_table text)
returns text
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_table is null or p_table not in
     ('hop_players','bloom_players','garden_players','star_players','field_players','bloomn_players') then
    raise exception 'unknown player table' using errcode = '22023';
  end if;
  return p_table;
end;
$$;

-- VOLATILE required because yomple_player_find writes rate-limit counters via yomple_lookup_ok
create or replace function public.yomple_player_find_any(p_username text, p_prefer text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_tables text[] := array['hop_players','bloom_players','bloomn_players','garden_players','star_players','field_players'];
  t text;
  v_hit jsonb;
begin
  if p_prefer is not null and p_prefer = any(v_tables) then
    v_tables := array[p_prefer] || array_remove(v_tables, p_prefer);
  end if;
  foreach t in array v_tables loop
    v_hit := public.yomple_player_find(t, p_username);
    if v_hit is not null then return v_hit; end if;
  end loop;
  return null;
end;
$$;

-- VOLATILE + rate-limited + literal wildcard escaping ('\', '%', '_')
create or replace function public.yomple_player_search(p_query text, p_family text default null)
returns setof jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_tables text[] := array['hop_players','bloom_players','bloomn_players','garden_players','star_players','field_players'];
  t text;
  v_user text := public.yomple_username(p_query);
  v_name text := btrim(coalesce(p_query, ''));
  v_fam  text := public.yomple_family(p_family);
  v_n    int := 0;
  v_row  jsonb;
  v_pass int;
  v_only text;
begin
  if v_user is null and length(v_name) < 1 then return; end if;
  if length(v_name) > 60 then v_name := left(v_name, 60); end if;
  if not public.yomple_lookup_ok('search', lower(left(v_name, 40))) then return; end if;
  v_name := replace(replace(replace(v_name, '\', '\\'), '%', '\%'), '_', '\_');
  for v_pass in 1..2 loop
    v_only := case when v_pass = 1 then v_fam else null end;
    if v_pass = 2 and (v_fam is null or v_n > 0) then exit; end if;
    foreach t in array v_tables loop
      for v_row in execute format($q$
        select jsonb_build_object(
                 'table', %L,
                 'username', t.username,
                 'display_name', t.display_name,
                 'avatar', t.avatar,
                 'family_code', t.family_code,
                 'has_pin', t.pin is not null)
          from public.%I t
         where ($1 <> '' and (t.username = $1 or t.username like ($1 || '-%%') escape '\')
                or t.display_name ilike $2 escape '\')
           and ($3 is null or t.family_code = $3)
         order by (t.username = $1) desc, t.username
         limit 20
      $q$, t, t) using coalesce(v_user, ''), v_name, v_only
      loop
        v_n := v_n + 1;
        if v_n > 40 then return; end if;
        return next v_row;
      end loop;
    end loop;
  end loop;
  if v_n = 0 then perform public.yomple_lookup_miss('search'); end if;
end;
$$;

-- Hardened upsert preserving yomple_pin_guard, yomple_write_ok, yomple_pin_missed, and 4-digit bcrypt PIN contract
create or replace function public.yomple_player_upsert(
  p_table text, p_username text, p_pin text, p_row jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_tables text[] := array['hop_players','bloom_players','bloomn_players','garden_players','star_players','field_players'];
  t text;
  v_user  text := public.yomple_username(p_username);
  v_name  text;
  v_av    text;
  v_fam   text;
  v_prog  jsonb;
  v_fun   jsonb;
  v_pin   text := case when p_pin ~ '^\d{4}$' then p_pin else null end;
  v_have  text;
  v_sis   text;
  v_exists boolean;
begin
  perform public.yomple_tbl(p_table);
  if v_user is null then return jsonb_build_object('ok', false, 'error', 'username'); end if;
  if p_row is null or jsonb_typeof(p_row) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'row');
  end if;
  if octet_length(p_row::text) > 262144 then
    return jsonb_build_object('ok', false, 'error', 'too_large');
  end if;
  if not public.yomple_pin_guard(p_table, v_user) then
    return jsonb_build_object('ok', false, 'error', 'pin');
  end if;
  if not public.yomple_write_ok(p_table, v_user) then
    return jsonb_build_object('ok', false, 'error', 'busy');
  end if;

  v_name := left(nullif(btrim(coalesce(p_row->>'display_name','')), ''), 60);
  v_av   := left(nullif(btrim(coalesce(p_row->>'avatar','')), ''), 16);
  v_fam  := public.yomple_family(p_row->>'family_code');
  v_prog := case when jsonb_typeof(p_row->'progress') = 'object' then p_row->'progress' else '{}'::jsonb end;
  v_fun  := case when jsonb_typeof(p_row->'fun') = 'object' then p_row->'fun' else '{}'::jsonb end;

  execute format('select true, t.pin from public.%I t where t.username = $1', p_table)
    into v_exists, v_have using v_user;

  if v_exists is true then
    if not public.yomple_pin_ok(v_have, p_pin) then
      perform public.yomple_pin_missed(p_table, v_user);
      return jsonb_build_object('ok', false, 'error', 'pin');
    end if;
    execute format($q$
      update public.%I set
        display_name = coalesce($2, display_name),
        avatar       = coalesce($3, avatar),
        family_code  = coalesce($4, family_code),
        progress     = $5,
        fun          = $6,
        pin          = coalesce(pin, $7),
        updated_at   = now()
      where username = $1
    $q$, p_table) using v_user, v_name, v_av, v_fam, v_prog, v_fun, v_pin;
    return jsonb_build_object('ok', true, 'created', false);
  end if;

  foreach t in array array_remove(v_tables, p_table) loop
    execute format('select t.pin from public.%I t where t.username = $1 and t.pin is not null', t)
      into v_sis using v_user;
    if v_sis is not null then
      if not public.yomple_pin_ok(v_sis, p_pin) then
        perform public.yomple_pin_missed(p_table, v_user);
        return jsonb_build_object('ok', false, 'error', 'pin');
      end if;
      exit;
    end if;
  end loop;

  execute format($q$
    insert into public.%I (username, display_name, avatar, family_code, progress, fun, pin, updated_at)
    values ($1, $2, $3, $4, $5, $6, $7, now())
    on conflict (username) do nothing
  $q$, p_table)
    using v_user, coalesce(v_name, v_user), coalesce(v_av, '❄️'), v_fam, v_prog, v_fun, coalesce(v_pin, v_sis);
  return jsonb_build_object('ok', true, 'created', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Internal IMMUTABLE JSONB deep-merge helpers (revoked from public/anon/authenticated)
-- ---------------------------------------------------------------------------

create or replace function public.bloomn_jsonb_num(
  p_obj jsonb,
  p_key text,
  p_default numeric default 0
)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when p_obj is not null
     and jsonb_typeof(p_obj) = 'object'
     and jsonb_typeof(p_obj->p_key) = 'number'
    then (p_obj->>p_key)::numeric
    else p_default
  end;
$$;

create or replace function public.bloomn_jsonb_pos_min(
  p_obj_a jsonb,
  p_obj_b jsonb,
  p_key text
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_a numeric := public.bloomn_jsonb_num(p_obj_a, p_key, -1);
  v_b numeric := public.bloomn_jsonb_num(p_obj_b, p_key, -1);
begin
  if v_a > 0 and v_b > 0 then
    return to_jsonb(least(v_a, v_b));
  elsif v_a > 0 then
    return to_jsonb(v_a);
  elsif v_b > 0 then
    return to_jsonb(v_b);
  else
    return 'null'::jsonb;
  end if;
end;
$$;

create or replace function public.bloomn_jsonb_array_union(p_a jsonb, p_b jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_arr_a jsonb := case when jsonb_typeof(p_a) = 'array' then p_a else '[]'::jsonb end;
  v_arr_b jsonb := case when jsonb_typeof(p_b) = 'array' then p_b else '[]'::jsonb end;
  v_out   jsonb := '[]'::jsonb;
  v_elem  jsonb;
begin
  for v_elem in select value from jsonb_array_elements(v_arr_a || v_arr_b) loop
    if not (v_out @> jsonb_build_array(v_elem)) then
      v_out := v_out || jsonb_build_array(v_elem);
    end if;
  end loop;
  return v_out;
end;
$$;

create or replace function public.bloomn_merge_num_map(p_a jsonb, p_b jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_ma  jsonb := case when jsonb_typeof(p_a) = 'object' then p_a else '{}'::jsonb end;
  v_mb  jsonb := case when jsonb_typeof(p_b) = 'object' then p_b else '{}'::jsonb end;
  v_out jsonb := '{}'::jsonb;
  v_k   text;
begin
  for v_k in
    select distinct k from (
      select jsonb_object_keys(v_ma) as k
      union
      select jsonb_object_keys(v_mb) as k
    ) keys
  loop
    v_out := v_out || jsonb_build_object(
      v_k,
      greatest(
        public.bloomn_jsonb_num(v_ma, v_k, 0),
        public.bloomn_jsonb_num(v_mb, v_k, 0)
      )
    );
  end loop;
  return v_out;
end;
$$;

create or replace function public.bloomn_merge_nodes(p_a jsonb, p_b jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_ma   jsonb := case when jsonb_typeof(p_a) = 'object' then p_a else '{}'::jsonb end;
  v_mb   jsonb := case when jsonb_typeof(p_b) = 'object' then p_b else '{}'::jsonb end;
  v_out  jsonb := '{}'::jsonb;
  v_k    text;
  v_na   jsonb;
  v_nb   jsonb;
  v_camo boolean;
begin
  for v_k in
    select distinct k from (
      select jsonb_object_keys(v_ma) as k
      union
      select jsonb_object_keys(v_mb) as k
    ) keys
  loop
    v_na := case when jsonb_typeof(v_ma->v_k) = 'object' then v_ma->v_k else '{}'::jsonb end;
    v_nb := case when jsonb_typeof(v_mb->v_k) = 'object' then v_mb->v_k else '{}'::jsonb end;
    v_camo := (jsonb_typeof(v_na->'camouflageCleared') = 'boolean' and (v_na->>'camouflageCleared')::boolean)
           or (jsonb_typeof(v_nb->'camouflageCleared') = 'boolean' and (v_nb->>'camouflageCleared')::boolean);
    v_out := v_out || jsonb_build_object(
      v_k,
      v_na || v_nb || jsonb_build_object(
        'pKnow', greatest(public.bloomn_jsonb_num(v_na, 'pKnow', 0.15), public.bloomn_jsonb_num(v_nb, 'pKnow', 0.15)),
        'stage', greatest(public.bloomn_jsonb_num(v_na, 'stage', 0), public.bloomn_jsonb_num(v_nb, 'stage', 0)),
        'attempts', greatest(public.bloomn_jsonb_num(v_na, 'attempts', 0), public.bloomn_jsonb_num(v_nb, 'attempts', 0)),
        'wins', greatest(public.bloomn_jsonb_num(v_na, 'wins', 0), public.bloomn_jsonb_num(v_nb, 'wins', 0)),
        'overdrives', greatest(public.bloomn_jsonb_num(v_na, 'overdrives', 0), public.bloomn_jsonb_num(v_nb, 'overdrives', 0)),
        'camouflageCleared', v_camo,
        'lastSeenAt', greatest(public.bloomn_jsonb_num(v_na, 'lastSeenAt', 0), public.bloomn_jsonb_num(v_nb, 'lastSeenAt', 0))
      )
    );
  end loop;
  return v_out;
end;
$$;

create or replace function public.bloomn_merge_games(p_older jsonb, p_newer jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_go jsonb := case when jsonb_typeof(p_older) = 'object' then p_older else '{}'::jsonb end;
  v_gn jsonb := case when jsonb_typeof(p_newer) = 'object' then p_newer else '{}'::jsonb end;
  v_fw_o jsonb := case when jsonb_typeof(v_go->'frostwake') = 'object' then v_go->'frostwake' else '{}'::jsonb end;
  v_fw_n jsonb := case when jsonb_typeof(v_gn->'frostwake') = 'object' then v_gn->'frostwake' else '{}'::jsonb end;
  v_or_o jsonb := case when jsonb_typeof(v_go->'oddroot') = 'object' then v_go->'oddroot' else '{}'::jsonb end;
  v_or_n jsonb := case when jsonb_typeof(v_gn->'oddroot') = 'object' then v_gn->'oddroot' else '{}'::jsonb end;
  v_fw_sec_o numeric := public.bloomn_jsonb_num(v_fw_o, 'bestWaveSec', -1);
  v_fw_sec_n numeric := public.bloomn_jsonb_num(v_fw_n, 'bestWaveSec', -1);
  v_fw_win   jsonb;
  v_or_sec_o numeric := public.bloomn_jsonb_num(v_or_o, 'bestCircuitSec', -1);
  v_or_sec_n numeric := public.bloomn_jsonb_num(v_or_n, 'bestCircuitSec', -1);
  v_or_win   jsonb;
  v_mosaic   boolean;
begin
  if v_fw_sec_o > 0 and (v_fw_sec_n <= 0 or v_fw_sec_o <= v_fw_sec_n) then
    v_fw_win := v_fw_o;
  else
    v_fw_win := v_fw_n;
  end if;

  if v_or_sec_o > 0 and (v_or_sec_n <= 0 or v_or_sec_o <= v_or_sec_n) then
    v_or_win := v_or_o;
  else
    v_or_win := v_or_n;
  end if;

  v_mosaic := (jsonb_typeof(v_or_o->'mosaicForged') = 'boolean' and (v_or_o->>'mosaicForged')::boolean)
           or (jsonb_typeof(v_or_n->'mosaicForged') = 'boolean' and (v_or_n->>'mosaicForged')::boolean)
           or public.bloomn_jsonb_num(v_or_o, 'mosaicForged', 0) > 0
           or public.bloomn_jsonb_num(v_or_n, 'mosaicForged', 0) > 0;

  return v_go || v_gn || jsonb_build_object(
    'frostwake',
    v_fw_o || v_fw_n || jsonb_build_object(
      'snowClearedM2', greatest(public.bloomn_jsonb_num(v_fw_o, 'snowClearedM2', 0), public.bloomn_jsonb_num(v_fw_n, 'snowClearedM2', 0)),
      'rimeCreepsCleared', greatest(public.bloomn_jsonb_num(v_fw_o, 'rimeCreepsCleared', 0), public.bloomn_jsonb_num(v_fw_n, 'rimeCreepsCleared', 0)),
      'foxDensThawed', greatest(public.bloomn_jsonb_num(v_fw_o, 'foxDensThawed', 0), public.bloomn_jsonb_num(v_fw_n, 'foxDensThawed', 0)),
      'bestWaveSec', public.bloomn_jsonb_pos_min(v_fw_o, v_fw_n, 'bestWaveSec'),
      'ghostFrames', coalesce(v_fw_win->'ghostFrames', v_fw_n->'ghostFrames', v_fw_o->'ghostFrames', '[]'::jsonb),
      'ghostBest', coalesce(v_fw_win->'ghostBest', v_fw_n->'ghostBest', v_fw_o->'ghostBest', 'null'::jsonb)
    ),
    'oddroot',
    v_or_o || v_or_n || jsonb_build_object(
      'cauldronsBrewed', greatest(public.bloomn_jsonb_num(v_or_o, 'cauldronsBrewed', 0), public.bloomn_jsonb_num(v_or_n, 'cauldronsBrewed', 0)),
      'hatchedCreatures', public.bloomn_jsonb_array_union(v_or_o->'hatchedCreatures', v_or_n->'hatchedCreatures'),
      'creatureStages', public.bloomn_merge_num_map(v_or_o->'creatureStages', v_or_n->'creatureStages'),
      'sanctuaryUpgrades', public.bloomn_jsonb_array_union(v_or_o->'sanctuaryUpgrades', v_or_n->'sanctuaryUpgrades'),
      'blightClearedM2', greatest(public.bloomn_jsonb_num(v_or_o, 'blightClearedM2', 0), public.bloomn_jsonb_num(v_or_n, 'blightClearedM2', 0)),
      'blightClearedCount', greatest(public.bloomn_jsonb_num(v_or_o, 'blightClearedCount', 0), public.bloomn_jsonb_num(v_or_n, 'blightClearedCount', 0)),
      'longestVineGrindM', greatest(public.bloomn_jsonb_num(v_or_o, 'longestVineGrindM', 0), public.bloomn_jsonb_num(v_or_n, 'longestVineGrindM', 0)),
      'bestCircuitSec', public.bloomn_jsonb_pos_min(v_or_o, v_or_n, 'bestCircuitSec'),
      'ghostFrames', coalesce(v_or_win->'ghostFrames', v_or_n->'ghostFrames', v_or_o->'ghostFrames', '[]'::jsonb),
      'ghostBest', coalesce(v_or_win->'ghostBest', v_or_n->'ghostBest', v_or_o->'ghostBest', 'null'::jsonb),
      'mosaicForged', v_mosaic
    )
  );
end;
$$;

revoke all on function public.bloomn_jsonb_num(jsonb, text, numeric) from public, anon, authenticated;
revoke all on function public.bloomn_jsonb_pos_min(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.bloomn_jsonb_array_union(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.bloomn_merge_num_map(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.bloomn_merge_nodes(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.bloomn_merge_games(jsonb, jsonb) from public, anon, authenticated;

-- Monotonic device-safe & rate-limited merge for Bloom N players
create or replace function public.bloomn_player_merge(
  p_username text,
  p_pin text,
  p_family text,
  p_display_name text,
  p_avatar text,
  p_progress jsonb,
  p_fun jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_tables text[] := array['hop_players','bloom_players','garden_players','star_players','field_players'];
  t text;
  v_user text := public.yomple_username(p_username);
  v_fam  text := public.yomple_family(p_family);
  v_name text := left(nullif(btrim(coalesce(p_display_name,'')), ''), 60);
  v_av   text := left(nullif(btrim(coalesce(p_avatar,'')), ''), 16);
  v_prog jsonb := case when jsonb_typeof(p_progress) = 'object' then p_progress else '{}'::jsonb end;
  v_fun  jsonb := case when jsonb_typeof(p_fun) = 'object' then p_fun else '{}'::jsonb end;
  v_pin  text := case when p_pin ~ '^\d{4}$' then p_pin else null end;
  v_existing public.bloomn_players%rowtype;
  v_older_p jsonb;
  v_newer_p jsonb;
  v_older_f jsonb;
  v_newer_f jsonb;
  v_cal     boolean;
  v_sis text;
  v_merged_prog jsonb;
  v_merged_fun  jsonb;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'username');
  end if;
  if octet_length(v_prog::text) + octet_length(v_fun::text) > 262144 then
    return jsonb_build_object('ok', false, 'error', 'too_large');
  end if;
  if not public.yomple_pin_guard('bloomn_players', v_user) then
    return jsonb_build_object('ok', false, 'error', 'pin');
  end if;
  if not public.yomple_write_ok('bloomn_players', v_user) then
    return jsonb_build_object('ok', false, 'error', 'busy');
  end if;

  select * into v_existing from public.bloomn_players where username = v_user for update;

  if found then
    if not public.yomple_pin_ok(v_existing.pin, p_pin) then
      perform public.yomple_pin_missed('bloomn_players', v_user);
      return jsonb_build_object('ok', false, 'error', 'pin');
    end if;

    if public.bloomn_jsonb_num(v_prog, 'rev', 0) >= public.bloomn_jsonb_num(v_existing.progress, 'rev', 0) then
      v_older_p := coalesce(v_existing.progress, '{}'::jsonb);
      v_newer_p := v_prog;
      v_older_f := coalesce(v_existing.fun, '{}'::jsonb);
      v_newer_f := v_fun;
    else
      v_older_p := v_prog;
      v_newer_p := coalesce(v_existing.progress, '{}'::jsonb);
      v_older_f := v_fun;
      v_newer_f := coalesce(v_existing.fun, '{}'::jsonb);
    end if;

    v_cal := (jsonb_typeof(v_older_p->'calibrated') = 'boolean' and (v_older_p->>'calibrated')::boolean)
          or (jsonb_typeof(v_newer_p->'calibrated') = 'boolean' and (v_newer_p->>'calibrated')::boolean);

    v_merged_prog := v_older_p || v_newer_p || jsonb_build_object(
      'rev', greatest(public.bloomn_jsonb_num(v_older_p, 'rev', 0), public.bloomn_jsonb_num(v_newer_p, 'rev', 0)),
      'calibrated', v_cal,
      'calibrationStep', greatest(public.bloomn_jsonb_num(v_older_p, 'calibrationStep', 0), public.bloomn_jsonb_num(v_newer_p, 'calibrationStep', 0)),
      'fluxShards', greatest(public.bloomn_jsonb_num(v_older_p, 'fluxShards', 0), public.bloomn_jsonb_num(v_newer_p, 'fluxShards', 0)),
      'totalSolved', greatest(public.bloomn_jsonb_num(v_older_p, 'totalSolved', 0), public.bloomn_jsonb_num(v_newer_p, 'totalSolved', 0)),
      'snowClearedM2', greatest(public.bloomn_jsonb_num(v_older_p, 'snowClearedM2', 0), public.bloomn_jsonb_num(v_newer_p, 'snowClearedM2', 0)),
      'unlockedWorlds', public.bloomn_jsonb_array_union(v_older_p->'unlockedWorlds', v_newer_p->'unlockedWorlds'),
      'ownedUpgrades', public.bloomn_jsonb_array_union(v_older_p->'ownedUpgrades', v_newer_p->'ownedUpgrades'),
      'discoveredMysteries', public.bloomn_jsonb_array_union(v_older_p->'discoveredMysteries', v_newer_p->'discoveredMysteries'),
      'seenTrickFamilies', public.bloomn_jsonb_array_union(v_older_p->'seenTrickFamilies', v_newer_p->'seenTrickFamilies'),
      'records', public.bloomn_merge_num_map(v_older_p->'records', v_newer_p->'records'),
      'misconceptionTags', public.bloomn_merge_num_map(v_older_p->'misconceptionTags', v_newer_p->'misconceptionTags'),
      'nodes', public.bloomn_merge_nodes(v_older_p->'nodes', v_newer_p->'nodes'),
      'games', public.bloomn_merge_games(v_older_p->'games', v_newer_p->'games')
    );

    v_merged_fun := v_older_f || v_newer_f || jsonb_build_object(
      'games', public.bloomn_merge_games(
        coalesce(v_older_f->'games', v_older_p->'games'),
        coalesce(v_newer_f->'games', v_newer_p->'games')
      )
    );

    update public.bloomn_players set
      display_name = coalesce(v_name, display_name),
      avatar       = coalesce(v_av, avatar),
      family_code  = coalesce(v_fam, family_code),
      progress     = v_merged_prog,
      fun          = v_merged_fun,
      pin          = coalesce(pin, v_pin),
      updated_at   = now()
    where username = v_user;

    return jsonb_build_object('ok', true, 'progress', v_merged_prog, 'fun', v_merged_fun);
  end if;

  foreach t in array v_tables loop
    execute format('select t.pin from public.%I t where t.username = $1 and t.pin is not null', t)
      into v_sis using v_user;
    if v_sis is not null then
      if not public.yomple_pin_ok(v_sis, p_pin) then
        perform public.yomple_pin_missed('bloomn_players', v_user);
        return jsonb_build_object('ok', false, 'error', 'pin');
      end if;
      exit;
    end if;
  end loop;

  insert into public.bloomn_players (username, display_name, avatar, family_code, progress, fun, pin, updated_at)
  values (v_user, coalesce(v_name, v_user), coalesce(v_av, '❄️'), v_fam, v_prog, v_fun, coalesce(v_pin, v_sis), now())
  on conflict (username) do nothing;

  return jsonb_build_object('ok', true, 'progress', v_prog, 'fun', v_fun);
end;
$$;

-- Non-competitive Household Northern Observatory sync
create or replace function public.bloomn_household_sync(
  p_family text,
  p_username text,
  p_display_name text,
  p_avatar text,
  p_flux_delta int,
  p_hero_title text,
  p_world_max int
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_fam   text := public.yomple_family(p_family);
  v_user  text := public.yomple_username(p_username);
  v_delta bigint := greatest(0, least(coalesce(p_flux_delta, 0), 5000));
  v_row   public.bloomn_household_wonders%rowtype;
  v_hero  jsonb;
  v_tier  int;
begin
  if v_fam is null then
    return jsonb_build_object('ok', false, 'error', 'family');
  end if;
  if not public.yomple_write_ok('bloomn_household_wonders', coalesce(v_user, v_fam)) then
    return jsonb_build_object('ok', false, 'error', 'busy');
  end if;

  insert into public.bloomn_household_wonders (family_code, total_flux, observatory_tier)
  values (v_fam, 0, 1)
  on conflict (family_code) do nothing;

  select * into v_row from public.bloomn_household_wonders where family_code = v_fam for update;

  v_row.total_flux := v_row.total_flux + v_delta;
  v_tier := case
    when v_row.total_flux >= 5000 then 6
    when v_row.total_flux >= 2500 then 5
    when v_row.total_flux >= 1200 then 4
    when v_row.total_flux >= 500  then 3
    when v_row.total_flux >= 180  then 2
    else 1
  end;

  if v_user is not null then
    v_hero := jsonb_build_object(
      'display_name', left(coalesce(nullif(btrim(p_display_name), ''), v_user), 40),
      'avatar', left(coalesce(nullif(btrim(p_avatar), ''), '❄️'), 16),
      'hero_title', left(coalesce(nullif(btrim(p_hero_title), ''), 'Frostwake Pioneer'), 48),
      'world_max', greatest(0, least(coalesce(p_world_max, 1), 7)),
      'updated_at', now()
    );
    v_row.heroes := coalesce(v_row.heroes, '{}'::jsonb) || jsonb_build_object(v_user, v_hero);
  end if;

  update public.bloomn_household_wonders set
    total_flux       = v_row.total_flux,
    observatory_tier = greatest(observatory_tier, v_tier),
    heroes           = v_row.heroes,
    updated_at       = now()
  where family_code = v_fam
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'family_code', v_row.family_code,
    'total_flux', v_row.total_flux,
    'observatory_tier', v_row.observatory_tier,
    'heroes', v_row.heroes
  );
end;
$$;

revoke all on function public.bloomn_player_merge(text, text, text, text, text, jsonb, jsonb) from public;
revoke all on function public.bloomn_household_sync(text, text, text, text, int, text, int) from public;
grant execute on function public.yomple_player_find_any(text, text) to anon, authenticated;
grant execute on function public.yomple_player_search(text, text) to anon, authenticated;
grant execute on function public.yomple_player_upsert(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.bloomn_player_merge(text, text, text, text, text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.bloomn_household_sync(text, text, text, text, int, text, int) to anon, authenticated;
