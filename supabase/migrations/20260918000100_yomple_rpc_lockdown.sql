-- yomple_rpc_lockdown
-- Step 1 of 2. Additive: PIN hashing + SECURITY DEFINER RPCs.
-- Old clients that still hit the tables directly keep working after this runs.
-- Step 2 (yomple_close_tables) removes the anon table policies.

-- ---------------------------------------------------------------- pin hashing

create or replace function public.yomple_hash_pin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.pin is null then
    new.pin := old.pin;  -- a PIN is never cleared by omission
  elsif new.pin is not null and new.pin ~ '^\d{4}$' then
    new.pin := extensions.crypt(new.pin, extensions.gen_salt('bf'));
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['hop_players','bloom_players','garden_players','star_players','field_players'] loop
    execute format('drop trigger if exists yomple_hash_pin on public.%I', t);
    execute format('create trigger yomple_hash_pin before insert or update on public.%I for each row execute function public.yomple_hash_pin()', t);
  end loop;
end;
$$;

create or replace function public.yomple_hash_parent_pin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.parent_pin is null then
    new.parent_pin := old.parent_pin;
  elsif new.parent_pin is not null and new.parent_pin ~ '^\d{4}$' then
    new.parent_pin := extensions.crypt(new.parent_pin, extensions.gen_salt('bf'));
  end if;
  return new;
end;
$$;

drop trigger if exists yomple_hash_parent_pin on public.hop_families;
create trigger yomple_hash_parent_pin before insert or update on public.hop_families
  for each row execute function public.yomple_hash_parent_pin();

-- one-off: hash the plaintext PINs that are already stored
update public.hop_players    set pin = pin where pin ~ '^\d{4}$';
update public.bloom_players  set pin = pin where pin ~ '^\d{4}$';
update public.garden_players set pin = pin where pin ~ '^\d{4}$';
update public.star_players   set pin = pin where pin ~ '^\d{4}$';
update public.field_players  set pin = pin where pin ~ '^\d{4}$';
update public.hop_families   set parent_pin = parent_pin where parent_pin ~ '^\d{4}$';

-- ------------------------------------------------------------------- new table

create table if not exists public.yomple_join_requests (
  id bigint generated always as identity primary key,
  username text not null,
  display_name text,
  avatar text,
  pin text,
  contact_email text,
  note text,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.yomple_join_requests enable row level security;

create or replace function public.yomple_hash_request_pin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.pin is not null and new.pin ~ '^\d{4}$' then
    new.pin := extensions.crypt(new.pin, extensions.gen_salt('bf'));
  end if;
  return new;
end;
$$;

drop trigger if exists yomple_hash_request_pin on public.yomple_join_requests;
create trigger yomple_hash_request_pin before insert or update on public.yomple_join_requests
  for each row execute function public.yomple_hash_request_pin();

-- rows removed through yomple_player_delete land here instead of vanishing
create table if not exists public.yomple_deleted_players (
  id bigint generated always as identity primary key,
  src_table text not null,
  row_data jsonb not null,
  deleted_at timestamptz not null default now()
);
alter table public.yomple_deleted_players enable row level security;

-- ------------------------------------------------------------------- validators

create or replace function public.yomple_tbl(p_table text)
returns text
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_table is null or p_table not in
     ('hop_players','bloom_players','garden_players','star_players','field_players') then
    raise exception 'unknown player table' using errcode = '22023';
  end if;
  return p_table;
end;
$$;

create or replace function public.yomple_username(p_username text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_username is null then null
    when lower(btrim(p_username)) ~ '^[a-z0-9][a-z0-9-]{0,31}$' then lower(btrim(p_username))
    else null
  end;
$$;

create or replace function public.yomple_family(p_code text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when upper(btrim(coalesce(p_code,''))) ~
      '^(OAK|MAPLE|PINE|CEDAR|ELM|BIRCH|WILLOW|ASPEN|LAUREL|HOLLY)-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$'
    then upper(btrim(p_code))
    else null
  end;
$$;

create or replace function public.yomple_email(p_email text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when lower(btrim(coalesce(p_email,''))) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     and length(btrim(p_email)) < 120
    then lower(btrim(p_email))
    else null
  end;
$$;

create or replace function public.yomple_pin_ok(p_stored text, p_pin text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when p_stored is null then true
    when p_pin is null or p_pin = '' then false
    when p_stored ~ '^\$2[abxy]?\$' then extensions.crypt(p_pin, p_stored) = p_stored
    else p_pin = p_stored
  end;
$$;

-- --------------------------------------------------------------------- reads

-- Row for one player, never the PIN. progress/fun are withheld when the row is
-- PIN-protected; yomple_player_claim returns them once the PIN is proved.
create or replace function public.yomple_player_find(p_table text, p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user text := public.yomple_username(p_username);
  v_row  jsonb;
begin
  perform public.yomple_tbl(p_table);
  if v_user is null then return null; end if;
  execute format('select to_jsonb(t) from public.%I t where t.username = $1 limit 1', p_table)
    into v_row using v_user;
  if v_row is null then return null; end if;
  return (v_row - 'pin')
       || jsonb_build_object('table', p_table, 'has_pin', (v_row->>'pin') is not null)
       || case when (v_row->>'pin') is not null
               then jsonb_build_object('progress', '{}'::jsonb, 'fun', '{}'::jsonb)
               else '{}'::jsonb end;
end;
$$;

-- Same, but walks the five sister tables; p_prefer is looked at first.
create or replace function public.yomple_player_find_any(p_username text, p_prefer text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tables text[] := array['hop_players','bloom_players','garden_players','star_players','field_players'];
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

-- Fuzzy find for the hub: exact username or display_name, never PINs or progress.
create or replace function public.yomple_player_search(p_query text, p_family text default null)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
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
  -- pass 1 keeps to the caller's household, pass 2 widens, as the hub did before
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

-- The client-side PIN comparison, moved server side. Null means "no match".
create or replace function public.yomple_player_claim(p_table text, p_username text, p_pin text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user text := public.yomple_username(p_username);
  v_row  jsonb;
begin
  perform public.yomple_tbl(p_table);
  if v_user is null then return null; end if;
  execute format('select to_jsonb(t) from public.%I t where t.username = $1 limit 1', p_table)
    into v_row using v_user;
  if v_row is null then return null; end if;
  if not public.yomple_pin_ok(v_row->>'pin', p_pin) then return null; end if;
  return (v_row - 'pin')
       || jsonb_build_object('table', p_table, 'has_pin', (v_row->>'pin') is not null);
end;
$$;

-- Players of one household, by family code. Code-only by design: the family code
-- is the household secret, exactly as before. Never returns PINs.
create or replace function public.yomple_family_players(p_code text, p_table text)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fam text := public.yomple_family(p_code);
  v_row jsonb;
begin
  perform public.yomple_tbl(p_table);
  if v_fam is null then return; end if;
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
$$;

-- Family code for the caller's OTP-verified email. Authenticated callers only.
create or replace function public.yomple_family_by_email()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := public.yomple_email(auth.jwt() ->> 'email');
begin
  if v_email is null then return null; end if;
  return (select f.family_code
            from public.hop_families f
           where lower(f.parent_email) = v_email
           order by f.updated_at desc
           limit 1);
end;
$$;

-- --------------------------------------------------------------------- writes

-- merge-duplicates semantics, with the PIN as the write credential.
-- Insert when absent; update only when the row has no PIN or p_pin matches.
-- A PIN already held by the same username in a sister table must be proved too,
-- so a protected player cannot be re-created unprotected in another world.
create or replace function public.yomple_player_upsert(
  p_table text, p_username text, p_pin text, p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  -- absent display_name/avatar keep whatever is stored, rather than clobbering it
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

  -- new row: honour a PIN the same player already carries elsewhere
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
    using v_user, coalesce(v_name, v_user), coalesce(v_av, '🌟'), v_fam, v_prog, v_fun, coalesce(v_pin, v_sis);
  return jsonb_build_object('ok', true, 'created', true);
end;
$$;

create or replace function public.yomple_family_upsert(p_code text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fam   text := public.yomple_family(p_code);
  v_email text := public.yomple_email(p_email);
  v_jwt   text := public.yomple_email(auth.jwt() ->> 'email');
  v_have  text;
begin
  if v_fam is null then return jsonb_build_object('ok', false, 'error', 'code'); end if;
  insert into public.hop_families (family_code, parent_email, updated_at)
  values (v_fam, v_email, now())
  on conflict (family_code) do nothing;

  select parent_email into v_have from public.hop_families where family_code = v_fam;
  -- the email is claimed once; after that only the OTP-verified owner may change it
  if v_email is not null and (v_have is null or v_jwt = v_email) then
    update public.hop_families
       set parent_email = v_email, updated_at = now()
     where family_code = v_fam;
  end if;
  return jsonb_build_object('ok', true, 'family_code', v_fam);
end;
$$;

create or replace function public.yomple_player_delete(p_table text, p_username text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user text := public.yomple_username(p_username);
  v_row  jsonb;
begin
  perform public.yomple_tbl(p_table);
  if v_user is null then return jsonb_build_object('ok', false, 'error', 'username'); end if;
  execute format('select to_jsonb(t) from public.%I t where t.username = $1', p_table)
    into v_row using v_user;
  if v_row is null then return jsonb_build_object('ok', true, 'deleted', false); end if;
  if not public.yomple_pin_ok(v_row->>'pin', p_pin) then
    return jsonb_build_object('ok', false, 'error', 'pin');
  end if;
  insert into public.yomple_deleted_players (src_table, row_data) values (p_table, v_row);
  execute format('delete from public.%I where username = $1', p_table) using v_user;
  return jsonb_build_object('ok', true, 'deleted', true);
end;
$$;

create or replace function public.yomple_join_request(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- ---------------------------------------------------------------------- grants

revoke all on function public.yomple_player_find(text, text)            from public;
revoke all on function public.yomple_player_find_any(text, text)        from public;
revoke all on function public.yomple_player_search(text, text)          from public;
revoke all on function public.yomple_player_claim(text, text, text)     from public;
revoke all on function public.yomple_player_upsert(text, text, text, jsonb) from public;
revoke all on function public.yomple_family_upsert(text, text)          from public;
revoke all on function public.yomple_family_players(text, text)         from public;
revoke all on function public.yomple_family_by_email()                  from public;
revoke all on function public.yomple_player_delete(text, text, text)    from public;
revoke all on function public.yomple_join_request(jsonb)                from public;

grant execute on function public.yomple_player_find(text, text)            to anon, authenticated;
grant execute on function public.yomple_player_find_any(text, text)        to anon, authenticated;
grant execute on function public.yomple_player_search(text, text)          to anon, authenticated;
grant execute on function public.yomple_player_claim(text, text, text)     to anon, authenticated;
grant execute on function public.yomple_player_upsert(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.yomple_family_upsert(text, text)          to anon, authenticated;
grant execute on function public.yomple_family_players(text, text)         to anon, authenticated;
grant execute on function public.yomple_player_delete(text, text, text)    to anon, authenticated;
grant execute on function public.yomple_join_request(jsonb)                to anon, authenticated;

-- OTP-verified callers only
grant execute on function public.yomple_family_by_email() to authenticated;

-- Supabase grants execute on new public functions to anon by default, so take
-- that default back for the one function that is for OTP-verified callers only.
revoke all on function public.yomple_family_by_email() from anon;
