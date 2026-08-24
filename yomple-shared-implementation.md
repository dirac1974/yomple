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

Columns: `username`, `display_name`, `avatar`, `pin`, `family_code`, `progress` jsonb, `fun` jsonb, `updated_at`.

## Recovery (same order everywhere)

1. Email this code to me (`mailto:` with the family code).
2. Optional: Supabase Auth OTP on `parent_email`, then look up `hop_families`.

On a new device, restore **all** `{module}_players` rows for that `family_code`.

## Adopt an existing household

On first launch, if `presidents-palace-v2` (or another Yomple key) already has `familyCode`, reuse it. Do not mint a second household.

## States

0 new · 1 practicing · 2 getting solid · 3 shining. Miss resets streak only.
