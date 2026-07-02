# QA Report — Invite-Only Auth + MFA (v14)

**Date:** 2026-07-02 · **Target:** https://agentwork.fly.dev · **Supabase:** sebsnowworhrqqyschao

## New-Feature Tests

| # | Test | Expected | Actual | Result |
|---|------|----------|--------|--------|
| 1 | Signup fresh user (qa1783019149@test.local) | User created | User created, profile row auto-created by trigger | ✅ PASS |
| 2 | Profile status after signup | `pending` | `pending` | ✅ PASS |
| 3 | User reads own profile via RLS (anon key + own JWT) | Allowed | Returned own row only | ✅ PASS |
| 4 | Self-approve: PATCH own `status` → `approved` via REST | Blocked by RLS | `42501 new row violates row-level security policy`; status still `pending` | ✅ PASS |
| 5 | Forged approval token: GET `/api/admin/approve?user=X&token=deadbeef…` | Error, not approved | "Approval Failed" error page; user still pending | ✅ PASS |
| 6 | Unauthenticated POST `/api/admin/approve` | 401 | 401 | ✅ PASS |
| 7 | Unauthenticated GET `/marketplace` | Redirect to /login | 307 → `/login` | ✅ PASS |
| 8 | `/pending` page renders | 200 | 200 | ✅ PASS |
| 9 | `/rejected` page renders | 200 | 200 | ✅ PASS |
| 10 | Anon reads `invite_codes` | Denied/empty | `[]` (RLS: authenticated-only) | ✅ PASS |
| 11 | Admin (abhi@sequoiadigital.io) sign-in | Session, status=approved | Signed in; profile `approved` | ✅ PASS |
| 12 | Admin sees own `admin_users` row (no RLS recursion) | Row returned | Row returned, no recursion error | ✅ PASS |
| 13 | Admin sees ALL profiles (`is_user_admin` policy) | All rows | 5+ profiles visible incl. other users | ✅ PASS |
| 14 | Non-admin sees only own profile | 1 row | 1 row (own) | ✅ PASS |

## Regression Tests

| # | Test | Expected | Actual | Result |
|---|------|----------|--------|--------|
| R1 | Landing page renders | 200 + agent grid | 200, avatars render | ✅ PASS |
| R2 | Avatar images (sage-strategist, nova-sdr, iris-cs) | 200 | 200 / 200 / 200 | ✅ PASS |
| R3 | robots noindex | present | `noindex, nofollow, nocache` | ✅ PASS |
| R4 | /login renders | 200 | 200 | ✅ PASS |

## Not Tested / Known Gaps

1. **Email confirmation NOT enforced (config, not code).** Signup returned a live session immediately (`confirmed_at: null`). The `enable_confirmations = true` change in `supabase/config.toml` does **not** apply to the hosted project — it must be toggled in Dashboard → Auth → Sign In / Providers → Email → "Confirm email". ⚠️ **Blocks the "verify all signup emails" requirement until flipped.**
2. **MFA TOTP enrollment end-to-end** — needs the Dashboard MFA/TOTP toggle enabled first; also requires an authenticator secret loop that's better tested manually. Server-side AAL2 middleware enforcement is deployed but only activates for users with a verified factor.
3. **Signup webhook email notification** — Supabase Auth Hook (user.created → /api/webhooks/signup) not yet configured in Dashboard; endpoint exists but currently only fires if configured. Also needs `RESEND_API_KEY` for actual email delivery (falls back to fly logs).
4. **Non-admin authenticated POST /api/admin/approve (403 path)** — requires app session cookies (@supabase/ssr chunked format); not reproducible via plain curl. Code path verified by review: non-admin hits `admin_users` lookup → 403.

## Bugs Found

**None during this QA round.** The five bugs found in the earlier audit (route export type errors, RLS recursion on admin_users, self-approval privilege escalation, invite-code anon leak, client-side-only MFA) were fixed in v14 and their fixes are verified above (#4, #5, #10, #12, #13).

## Leftover Test Users (cleanup candidates)
- qa1783019149@test.local (this round)
- qa2+agentwork@test.local, qa+agentwork@test.local, probe-1782954405@agentwork.dev, abhi-test@agentwork.dev, abhirup@mac.com (pending)
