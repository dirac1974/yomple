-- Throttling, and the end of the wildcard scrape.
--
-- Two problems this closes:
--
--  1. yomple_player_search matched display names with ILIKE against the caller's
--     raw text. A query of "%" therefore matched every player in every world and
--     returned, for each one, their username, their display name and their
--     HOUSEHOLD CODE -- the shared secret every Yomple app and Shockmate trust.
--     One request with the public key dumped the lot. Wildcards are now escaped,
--     so the query means what a person typing a name meant it to mean.
--
--  2. Nothing here counted attempts. A family code (about 9.2M) and a 4-digit PIN
--     are both small enough to grind, so the doors now spend from a budget that
--     refills by itself. No lockout is permanent: a window expires and the row is
--     forgotten a day later.
--
-- Every function keeps its return shape so the live clients keep working. Over
-- budget looks like "nothing found", which is also one less oracle.

create table if not exists yomple_rate (
  bucket text        not null,
  key    text        not null,
  n      integer     not null default 0,
  since  timestamptz not null default now(),
  primary key (bucket, key)
);
alter table yomple_rate enable row level security;   -- no policies, no grants: RPC-only
revoke all on yomple_rate from anon, authenticated;
create index if not exists yomple_rate_since on yomple_rate (since);

-- A coarse caller fingerprint: the address Supabase's edge appended to
-- X-Forwarded-For. The LAST entry is the one the edge wrote; earlier entries are
-- whatever the caller sent and can be invented, so they are ignored.
create or replace function yomple_client()
  returns text
  language sql
  stable
  set search_path to 'public'
as $function$
  select coalesce(
    nullif(btrim(regexp_replace(
      coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
      '^.*,', '')), ''),
    'local');
$function$;

create or replace function yomple_rate_ok(p_bucket text, p_key text, p_limit integer, p_window interval)
  returns boolean
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare v_n integer;
begin
  if p_key is null or p_key = '' then return true; end if;
  insert into yomple_rate (bucket, key, n, since)
       values (p_bucket, left(p_key, 80), 1, now())
  on conflict (bucket, key) do update
     set n     = case when yomple_rate.since < now() - p_window then 1 else yomple_rate.n + 1 end,
         since = case when yomple_rate.since < now() - p_window then now() else yomple_rate.since end
  returning n into v_n;
  if random() < 0.002 then
    delete from yomple_rate where since < now() - interval '1 day';
  end if;
  return v_n <= p_limit;
end;
$function$;

-- Says whether a caller is over budget without spending from it, so the window
-- still ages out from the first attempt rather than the most recent one.
create or replace function yomple_rate_over(p_bucket text, p_key text, p_limit integer, p_window interval)
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  select exists (select 1 from yomple_rate
                  where bucket = p_bucket and key = left(coalesce(p_key, ''), 80)
                    and n >= p_limit and since > now() - p_window);
$function$;

revoke all on function yomple_client() from public, anon, authenticated;
revoke all on function yomple_rate_ok(text, text, integer, interval) from public, anon, authenticated;
revoke all on function yomple_rate_over(text, text, integer, interval) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Search. Two changes: '%' and '_' in the typed text are escaped so a name is a
-- name and not a pattern, and a caller gets 60 searches an hour. The row shape is
-- untouched -- the apps read family_code back off a hit to rejoin a household on
-- a new device, and that flow must keep working.
create or replace function yomple_player_search(p_query text, p_family text default null::text)
  returns setof jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_tables text[] := array['hop_players','bloom_players','garden_players','star_players','field_players'];
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
  if public.yomple_rate_over('search_ip', public.yomple_client(), 60, interval '1 hour') then return; end if;
  perform public.yomple_rate_ok('search_ip', public.yomple_client(), 60, interval '1 hour');
  -- A typed name is literal text. Without this, "%" matched every child in every
  -- household and handed back their family codes.
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
$function$;

-- ---------------------------------------------------------------------------
-- The household roster. A bare code opens it, so code guessing is budgeted the
-- same way as Shockmate's: 60 an hour per caller, 200 an hour per code. Over
-- budget returns no rows, exactly like a code nobody has claimed.
create or replace function yomple_family_players(p_code text, p_table text)
  returns setof jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_fam text := public.yomple_family(p_code);
  v_row jsonb;
begin
  perform public.yomple_tbl(p_table);
  if v_fam is null then return; end if;
  if public.yomple_rate_over('roster_ip', public.yomple_client(), 60, interval '1 hour')
     or public.yomple_rate_over('roster_code', v_fam, 200, interval '1 hour') then
    return;
  end if;
  perform public.yomple_rate_ok('roster_ip', public.yomple_client(), 60, interval '1 hour');
  perform public.yomple_rate_ok('roster_code', v_fam, 200, interval '1 hour');
  for v_row in execute format($q$
    select (to_jsonb(t) - 'pin')
           || jsonb_build_object('table', %L, 'has_pin', t.pin is not null)
      from public.%I t
     where t.family_code = $1
     order by t.username
     limit 50
  $q$, p_table, p_table) using v_fam
  loop
    return next v_row;
  end loop;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Username lookup. A username is not a secret and a hit hands back the household
-- code, so walking a dictionary of names is the cheap way in. 120 an hour per
-- caller -- far above a child typing their own name, far below a word list.
create or replace function yomple_player_find(p_table text, p_username text)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_user text := public.yomple_username(p_username);
  v_row  jsonb;
begin
  perform public.yomple_tbl(p_table);
  if v_user is null then return null; end if;
  if public.yomple_rate_over('find_ip', public.yomple_client(), 120, interval '1 hour') then return null; end if;
  perform public.yomple_rate_ok('find_ip', public.yomple_client(), 120, interval '1 hour');
  execute format('select to_jsonb(t) from public.%I t where t.username = $1 limit 1', p_table)
    into v_row using v_user;
  if v_row is null then return null; end if;
  return (v_row - 'pin')
       || jsonb_build_object('table', p_table, 'has_pin', (v_row->>'pin') is not null)
       || case when (v_row->>'pin') is not null
               then jsonb_build_object('progress', '{}'::jsonb, 'fun', '{}'::jsonb)
               else '{}'::jsonb end;
end;
$function$;

-- ---------------------------------------------------------------------------
-- PIN guessing, on the three functions that check one. A wrong PIN costs a unit;
-- a right one costs nothing. 10 wrong for the same player in 15 minutes, or 40
-- wrong from one caller in an hour, and PIN checks stop answering until the
-- window turns over. Each returns the shape it already returned for a bad PIN.
create or replace function yomple_pin_guard(p_table text, p_user text)
  returns boolean            -- true when the caller may still try a PIN
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  select not public.yomple_rate_over('pin_user', p_table || ':' || coalesce(p_user, ''), 10, interval '15 minutes')
     and not public.yomple_rate_over('pin_ip', public.yomple_client(), 40, interval '1 hour');
$function$;

create or replace function yomple_pin_missed(p_table text, p_user text)
  returns void
  language sql
  security definer
  set search_path to 'public'
as $function$
  select public.yomple_rate_ok('pin_user', p_table || ':' || coalesce(p_user, ''), 10, interval '15 minutes')
     and public.yomple_rate_ok('pin_ip', public.yomple_client(), 40, interval '1 hour');
$function$;

revoke all on function yomple_pin_guard(text, text) from public, anon, authenticated;
revoke all on function yomple_pin_missed(text, text) from public, anon, authenticated;

create or replace function yomple_player_claim(p_table text, p_username text, p_pin text)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_user text := public.yomple_username(p_username);
  v_row  jsonb;
begin
  perform public.yomple_tbl(p_table);
  if v_user is null then return null; end if;
  if not public.yomple_pin_guard(p_table, v_user) then return null; end if;
  execute format('select to_jsonb(t) from public.%I t where t.username = $1 limit 1', p_table)
    into v_row using v_user;
  if v_row is null then return null; end if;
  if not public.yomple_pin_ok(v_row->>'pin', p_pin) then
    perform public.yomple_pin_missed(p_table, v_user);
    return null;
  end if;
  return (v_row - 'pin')
       || jsonb_build_object('table', p_table, 'has_pin', (v_row->>'pin') is not null);
end;
$function$;

create or replace function yomple_player_delete(p_table text, p_username text, p_pin text)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_user text := public.yomple_username(p_username);
  v_row  jsonb;
begin
  perform public.yomple_tbl(p_table);
  if v_user is null then return jsonb_build_object('ok', false, 'error', 'username'); end if;
  if not public.yomple_pin_guard(p_table, v_user) then
    return jsonb_build_object('ok', false, 'error', 'pin');
  end if;
  execute format('select to_jsonb(t) from public.%I t where t.username = $1', p_table)
    into v_row using v_user;
  if v_row is null then return jsonb_build_object('ok', true, 'deleted', false); end if;
  if not public.yomple_pin_ok(v_row->>'pin', p_pin) then
    perform public.yomple_pin_missed(p_table, v_user);
    return jsonb_build_object('ok', false, 'error', 'pin');
  end if;
  insert into public.yomple_deleted_players (src_table, row_data) values (p_table, v_row);
  execute format('delete from public.%I where username = $1', p_table) using v_user;
  return jsonb_build_object('ok', true, 'deleted', true);
end;
$function$;

create or replace function yomple_player_upsert(p_table text, p_username text, p_pin text, p_row jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_tables text[] := array['hop_players','bloom_players','garden_players','star_players','field_players'];
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
  -- New players are budgeted too, or one caller could fill the worlds with rows.
  if not public.yomple_rate_ok('upsert_ip', public.yomple_client(), 300, interval '1 hour') then
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
    using v_user, coalesce(v_name, v_user), coalesce(v_av, '🌟'), v_fam, v_prog, v_fun, coalesce(v_pin, v_sis);
  return jsonb_build_object('ok', true, 'created', true);
end;
$function$;

-- ---------------------------------------------------------------------------
-- Join requests are an open inbox: anybody may post one and a parent reads it
-- later. 5 an hour per caller and 3 a day per username keeps it an inbox rather
-- than a spam funnel, without ever turning a real child away for good.
create or replace function yomple_join_request(p_payload jsonb)
  returns jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_user text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'payload');
  end if;
  if octet_length(p_payload::text) > 4096 then
    return jsonb_build_object('ok', false, 'error', 'too_large');
  end if;
  v_user := public.yomple_username(p_payload->>'username');
  if v_user is null then return jsonb_build_object('ok', false, 'error', 'username'); end if;
  if not public.yomple_rate_ok('join_ip', public.yomple_client(), 5, interval '1 hour')
     or not public.yomple_rate_ok('join_user', v_user, 3, interval '1 day') then
    return jsonb_build_object('ok', false, 'error', 'busy');
  end if;
  insert into public.yomple_join_requests
    (username, display_name, avatar, pin, contact_email, note, status, payload)
  values (
    v_user,
    left(coalesce(p_payload->>'display_name', v_user), 60),
    left(coalesce(p_payload->>'avatar', ''), 16),
    case when (p_payload->>'pin') ~ '^\d{4}$' then p_payload->>'pin' else null end,
    public.yomple_email(p_payload->>'contact_email'),
    left(coalesce(p_payload->>'note', ''), 500),
    'pending',
    p_payload - 'pin'
  );
  return jsonb_build_object('ok', true);
end;
$function$;

grant execute on function yomple_player_search(text, text)    to anon, authenticated;
grant execute on function yomple_family_players(text, text)   to anon, authenticated;
grant execute on function yomple_player_find(text, text)      to anon, authenticated;
grant execute on function yomple_player_claim(text, text, text)  to anon, authenticated;
grant execute on function yomple_player_delete(text, text, text) to anon, authenticated;
grant execute on function yomple_player_upsert(text, text, text, jsonb) to anon, authenticated;
grant execute on function yomple_join_request(jsonb)          to anon, authenticated;
