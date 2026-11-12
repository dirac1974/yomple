-- 20261112000100_bloom_n_players.sql
-- Additive migration for Bloom N (Pre-Algebra -> Algebra 1 -> Geometry -> Algebra 2).
-- Preserves all Yomple RPC lockdown invariants: bcrypt PIN hashing, closed RLS tables,
-- SECURITY DEFINER RPC access only, monotonic device-safe progress merge, and
-- non-competitive household co-op Northern Observatory wonders.

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

-- Register bloomn_players in Yomple's table whitelist and multi-world helpers
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

create or replace function public.yomple_player_find_any(p_username text, p_prefer text default null)
returns jsonb
language plpgsql
stable
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

create or replace function public.yomple_player_search(p_query text, p_family text default null)
returns setof jsonb
language plpgsql
stable
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
         where ($1 <> '' and (t.username = $1 or t.username like $1 || '-%%')
                or t.display_name ilike $2)
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
end;
$$;

create or replace function public.yomple_player_upsert(
  p_table text, p_username text, p_pin text, p_row jsonb)
returns jsonb
language plpgsql
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
  v_pin   text := case when p_pin ~ '^\d{4,6}$' then p_pin else null end;
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

  v_name := left(nullif(btrim(coalesce(p_row->>'display_name','')), ''), 60);
  v_av   := left(nullif(btrim(coalesce(p_row->>'avatar','')), ''), 16);
  v_fam  := public.yomple_family(p_row->>'family_code');
  v_prog := case when jsonb_typeof(p_row->'progress') = 'object' then p_row->'progress' else '{}'::jsonb end;
  v_fun  := case when jsonb_typeof(p_row->'fun') = 'object' then p_row->'fun' else '{}'::jsonb end;

  execute format('select true, t.pin from public.%I t where t.username = $1', p_table)
    into v_exists, v_have using v_user;

  if v_exists is true then
    if not public.yomple_pin_ok(v_have, p_pin) then
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

-- Monotonic device-safe merge for Bloom N players
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
  v_pin  text := case when p_pin ~ '^\d{4,6}$' then p_pin else null end;
  v_existing public.bloomn_players%rowtype;
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

  select * into v_existing from public.bloomn_players where username = v_user;

  if found then
    if not public.yomple_pin_ok(v_existing.pin, p_pin) then
      return jsonb_build_object('ok', false, 'error', 'pin');
    end if;

    -- Keep higher monotonic counters while merging JSON maps cleanly
    v_merged_prog := coalesce(v_existing.progress, '{}'::jsonb) || v_prog || jsonb_build_object(
      'rev', greatest(
        coalesce((v_existing.progress->>'rev')::bigint, 0),
        coalesce((v_prog->>'rev')::bigint, 0)
      ),
      'fluxShards', greatest(
        coalesce((v_existing.progress->>'fluxShards')::bigint, 0),
        coalesce((v_prog->>'fluxShards')::bigint, 0)
      ),
      'totalSolved', greatest(
        coalesce((v_existing.progress->>'totalSolved')::bigint, 0),
        coalesce((v_prog->>'totalSolved')::bigint, 0)
      ),
      'nodes', coalesce(v_existing.progress->'nodes', '{}'::jsonb) || coalesce(v_prog->'nodes', '{}'::jsonb)
    );
    v_merged_fun := coalesce(v_existing.fun, '{}'::jsonb) || v_fun;

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
        return jsonb_build_object('ok', false, 'error', 'pin');
      end if;
      exit;
    end if;
  end loop;

  insert into public.bloomn_players (username, display_name, avatar, family_code, progress, fun, pin, updated_at)
  values (v_user, coalesce(v_name, v_user), coalesce(v_av, '❄️'), v_fam, v_prog, v_fun, coalesce(v_pin, v_sis), now());

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
      'hero_title', left(coalesce(nullif(btrim(p_hero_title), ''), 'Frost Pioneer'), 48),
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
grant execute on function public.bloomn_player_merge(text, text, text, text, text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.bloomn_household_sync(text, text, text, text, int, text, int) to anon, authenticated;
