# Yomple shared implementation

**Purpose:** One household, one parent recovery path, one progress language — every Yomple module.
**Reference:** Hall of Presidents (`family.js` + `sync.js` + `hop_families`).
**Project:** `digcgqltrlmhgmzgmvwc`

Do not invent a second login system.

## Household

`public.hop_families` — `family_code` (PK, `MAPLE-K7Q2`), `parent_email` (optional), timestamps.

Word list: OAK MAPLE PINE CEDAR ELM BIRCH WILLOW ASPEN LAUREL HOLLY  
Tail: 4 chars from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`.

Kids never see the code or parent email. Parents see it only on Parent / Progress.

## Module player tables

| Module | Table |
|--------|--------|
| Hall of Presidents | `hop_players` |
| Bloom | `bloom_players` |
| Word Garden | `garden_players` |
| Star Map | `star_players` |
| Quiet Field | `field_players` |

Columns: `username`, `display_name`, `avatar`, `pin`, `family_code`, `progress` jsonb, `fun` jsonb, `updated_at`.

## Access

The anon key in every client is public — it ships in the page source and anyone
can read it. It is now safe there, because it opens nothing on its own.

- **The tables are closed.** `anon` and `authenticated` hold no policies and no
  table privileges on `hop_families`, `hop_players`, `bloom_players`,
  `garden_players`, `star_players`, `field_players`,
  `yomple_join_requests`, `yomple_deleted_players`. `POST /rest/v1/<table>`
  returns nothing to a client. Edge functions that use the service role
  (`bloom-sync`, `word-garden`, `bloom`) are unaffected.
- **Everything goes through `SECURITY DEFINER` functions**, called as
  `POST /rest/v1/rpc/<name>` with `apikey` + `Authorization: Bearer <anon>`.
  Each validates its table name against the five above, normalises the username,
  validates the family code, and caps `progress` at 256 KB.

| Function | Who | What |
|----------|-----|------|
| `yomple_player_find(p_table, p_username)` | anon | one row, never the PIN, plus `has_pin`. `progress`/`fun` are withheld when a PIN is set |
| `yomple_player_find_any(p_username, p_prefer)` | anon | the same across all five tables, `p_prefer` first |
| `yomple_player_search(p_query, p_family)` | anon | hub find: username, `<username>-*`, or exact `display_name`; identity fields only |
| `yomple_player_claim(p_table, p_username, p_pin)` | anon | the full row once the PIN checks out; `null` if it does not |
| `yomple_player_upsert(p_table, p_username, p_pin, p_row)` | anon | insert if absent, update only with no PIN or the right PIN |
| `yomple_family_upsert(p_code, p_email)` | anon | insert; the email is claimed once, then only its OTP-verified owner may change it |
| `yomple_family_players(p_code, p_table)` | anon | restore by family code |
| `yomple_family_by_email()` | authenticated | family code for the OTP-verified caller, from `auth.jwt()` |
| `yomple_player_delete(p_table, p_username, p_pin)` | anon | needs the PIN if one is set; the row is copied to `yomple_deleted_players` first |
| `yomple_join_request(p_payload)` | anon | one row into `yomple_join_requests`, 4 KB cap |

### The PIN rule

A PIN is never stored, sent or compared in plaintext.

- A `BEFORE INSERT OR UPDATE` trigger on all five player tables (and on
  `hop_families.parent_pin`) replaces any value matching `^\d{4}$` with
  `crypt(pin, gen_salt('bf'))`. Any writer is covered, including `bloom-sync`.
- An update that leaves `pin` null keeps the stored PIN. A PIN can be set or
  changed, never wiped by omission.
- No function ever returns a PIN or a hash. Clients keep caching the PIN the
  user typed, in localStorage, exactly as before; they learn only `has_pin`.
- A username that carries a PIN in one world must prove it before that username
  can be created in another, so a protected player cannot be re-made unprotected.

### What is still open on purpose

Restore is by family code alone, as it has always been: whoever types
`MAPLE-K7Q2` gets that household's players and progress. The code is the
household secret and the parent is told not to share it. Finding a player by
name also reveals that the name exists, its avatar and its household — but for
a PIN-protected player, nothing more.

## Recovery (same order everywhere)

1. Email this code to me (`mailto:` with the family code).
2. Optional: Supabase Auth OTP on `parent_email`, then `yomple_family_by_email()`
   with the session's access token.

On a new device, restore **all** `{module}_players` rows for that `family_code`.

## Adopt an existing household

On first launch, if `presidents-palace-v2` (or another Yomple key) already has `familyCode`, reuse it. Do not mint a second household.

## States

0 new · 1 practicing · 2 getting solid · 3 shining. Miss resets streak only.
