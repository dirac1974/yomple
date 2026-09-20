-- Budgets keyed on the target, not on the caller.
--
-- The first pass keyed every budget on the last X-Forwarded-For hop. Measured,
-- that fingerprint holds for /rest/v1/rpc (70 calls from one machine landed on a
-- single key and the limit engaged at 60) but NOT for /functions/v1: the Functions
-- edge fronts requests from an AWS pool, and the same 70 calls spread across 11
-- keys (13.248.99.*, 99.82.172.*), none reaching the limit. A budget that a caller
-- can rotate simply by making requests is not a budget.
--
-- So the load-bearing key is now the thing being attacked, which an attacker cannot
-- rotate: the family code, the username, the player. The fingerprint stays as a
-- second dimension, because it does work on the RPC path and costs nothing.
--
-- On top of that, one GLOBAL bucket per operation bounds mass scraping even when
-- the code and the fingerprint both vary. A global bucket normally risks one
-- attacker denying everyone, so these count MISSES ONLY -- lookups that found
-- nothing. A real household looks up codes and names that exist and never spends
-- from them; enumeration is almost entirely misses and burns them quickly.
--
-- Numbers, and why a real household never trips them. Take a busy household of 5
-- devices: each app open does at most ~2 roster calls, and 5 devices opening 6
-- times in 10 minutes is ~60 lookups -- all hits, so the global miss budget stays
-- untouched. The per-code ceiling (200/hr) sits above that with room to spare.
-- The global miss budgets (300 per 10 min) are reachable only by someone walking
-- codes or names that do not exist; at that rate the ~9.2M code space takes over
-- 50 years.

-- Spend only when the caller is already known to be inside every budget, so a
-- blocked caller cannot push its own window forward.
create or replace function yomple_lookup_ok(p_op text, p_target text)
  returns boolean
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  -- target first: it is the dimension an attacker cannot rotate
  if public.yomple_rate_over(p_op || '_t', p_target, 200, interval '1 hour') then return false; end if;
  if public.yomple_rate_over(p_op || '_ip', public.yomple_client(), 120, interval '1 hour') then return false; end if;
  if public.yomple_rate_over(p_op || '_miss', 'all', 300, interval '10 minutes') then return false; end if;
  perform public.yomple_rate_ok(p_op || '_t', p_target, 200, interval '1 hour');
  perform public.yomple_rate_ok(p_op || '_ip', public.yomple_client(), 120, interval '1 hour');
  return true;
end;
$function$;

-- Called only when a lookup found nothing. Scraping is nearly all misses; a family
-- opening its own household is nearly all hits.
create or replace function yomple_lookup_miss(p_op text)
  returns void
  language sql
  security definer
  set search_path to 'public'
as $function$
  select public.yomple_rate_ok(p_op || '_miss', 'all', 300, interval '10 minutes');
$function$;

revoke all on function yomple_lookup_ok(text, text) from public, anon, authenticated;
revoke all on function yomple_lookup_miss(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
create or replace function yomple_family_players(p_code text, p_table text)
  returns setof jsonb
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_fam text := public.yomple_family(p_code);
  v_row jsonb;
  v_n   int := 0;
begin
  perform public.yomple_tbl(p_table);
  if v_fam is null then return; end if;
  if not public.yomple_lookup_ok('roster', v_fam) then return; end if;
  for v_row in execute format($q$
    select (to_jsonb(t) - 'pin')
           || jsonb_build_object('table', %L, 'has_pin', t.pin is not null)
      from public.%I t
     where t.family_code = $1
     order by t.username
     limit 50
  $q$, p_table, p_table) using v_fam
  loop
    v_n := v_n + 1;
    return next v_row;
  end loop;
  if v_n = 0 then perform public.yomple_lookup_miss('roster'); end if;
end;
$function$;

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
  if not public.yomple_lookup_ok('find', v_user) then return null; end if;
  execute format('select to_jsonb(t) from public.%I t where t.username = $1 limit 1', p_table)
    into v_row using v_user;
  if v_row is null then
    perform public.yomple_lookup_miss('find');
    return null;
  end if;
  return (v_row - 'pin')
       || jsonb_build_object('table', p_table, 'has_pin', (v_row->>'pin') is not null)
       || case when (v_row->>'pin') is not null
               then jsonb_build_object('progress', '{}'::jsonb, 'fun', '{}'::jsonb)
               else '{}'::jsonb end;
end;
$function$;

-- Search is keyed on the text searched for: a scraper must vary it to learn
-- anything, and varying it is exactly what the budget counts.
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
  if not public.yomple_lookup_ok('search', lower(left(v_name, 40))) then return; end if;
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
  if v_n = 0 then perform public.yomple_lookup_miss('search'); end if;
end;
$function$;

-- ---------------------------------------------------------------------------
-- PIN checks were already keyed on (table, username), which cannot be rotated.
-- Added: a global bucket of wrong PINs, so a bot spreading one guess across
-- thousands of children is bounded too. Only failures count, so a household
-- mistyping now and then never reaches it.
create or replace function yomple_pin_guard(p_table text, p_user text)
  returns boolean
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  select not public.yomple_rate_over('pin_user', p_table || ':' || coalesce(p_user, ''), 10, interval '15 minutes')
     and not public.yomple_rate_over('pin_ip', public.yomple_client(), 40, interval '1 hour')
     and not public.yomple_rate_over('pin_all', 'all', 200, interval '10 minutes');
$function$;

create or replace function yomple_pin_missed(p_table text, p_user text)
  returns void
  language sql
  security definer
  set search_path to 'public'
as $function$
  select public.yomple_rate_ok('pin_user', p_table || ':' || coalesce(p_user, ''), 10, interval '15 minutes')
     and public.yomple_rate_ok('pin_ip', public.yomple_client(), 40, interval '1 hour')
     and public.yomple_rate_ok('pin_all', 'all', 200, interval '10 minutes');
$function$;

-- Writes are budgeted per player, which the writer cannot rotate without first
-- passing that player's PIN check.
create or replace function yomple_write_ok(p_table text, p_user text)
  returns boolean
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if public.yomple_rate_over('write_user', p_table || ':' || coalesce(p_user, ''), 200, interval '1 hour')
     or public.yomple_rate_over('write_all', 'all', 2000, interval '10 minutes') then
    return false;
  end if;
  perform public.yomple_rate_ok('write_user', p_table || ':' || coalesce(p_user, ''), 200, interval '1 hour');
  perform public.yomple_rate_ok('write_all', 'all', 2000, interval '10 minutes');
  return true;
end;
$function$;

revoke all on function yomple_write_ok(text, text) from public, anon, authenticated;

-- Upsert: swap the caller-keyed budget for the per-player one above.
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
    using v_user, coalesce(v_name, v_user), coalesce(v_av, '🌟'), v_fam, v_prog, v_fun, coalesce(v_pin, v_sis);
  return jsonb_build_object('ok', true, 'created', true);
end;
$function$;

-- Join requests: per-username and per-caller as before, plus a global ceiling so
-- rotating usernames cannot flood the parent's inbox.
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
  if not public.yomple_rate_ok('join_user', v_user, 3, interval '1 day')
     or not public.yomple_rate_ok('join_ip', public.yomple_client(), 5, interval '1 hour')
     or not public.yomple_rate_ok('join_all', 'all', 50, interval '10 minutes') then
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

grant execute on function yomple_family_players(text, text)   to anon, authenticated;
grant execute on function yomple_player_find(text, text)      to anon, authenticated;
grant execute on function yomple_player_search(text, text)    to anon, authenticated;
grant execute on function yomple_player_upsert(text, text, text, jsonb) to anon, authenticated;
grant execute on function yomple_join_request(jsonb)          to anon, authenticated;
