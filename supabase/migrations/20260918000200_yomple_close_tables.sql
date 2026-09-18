-- yomple_close_tables
-- Step 2 of 2. Run only once every client is on the yomple_* functions
-- (see 20260918000100_yomple_rpc_lockdown.sql).
--
-- After this the public anon key opens nothing: no policy and no privilege on
-- any of these tables. Reads and writes happen only through the SECURITY
-- DEFINER functions, which run as the owner and check the PIN. Edge functions
-- that hold the service role (bloom, bloom-sync, word-garden) are unaffected.

do $$
declare
  t text;
  p record;
  tabs text[] := array[
    'hop_families','hop_players','bloom_players','garden_players',
    'star_players','field_players','yomple_join_requests','yomple_deleted_players'
  ];
begin
  foreach t in array tabs loop
    for p in
      select policyname from pg_policies
       where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- Shockmate moved to its own project; these were left behind and unused.
drop function if exists public.chess_pull(text, text, text);
drop function if exists public.chess_push(text, text, text, jsonb);
drop function if exists public.chess_roster(text);
