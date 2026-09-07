# Security

This system contains sensitive academic data. Supabase RLS is the primary data boundary; authenticated UI state is not authorization.

- Google OAuth only; authentication does not imply chapter membership.
- Unlinked profiles can create/read only their own access request.
- All policies scope access through approved member/profile linkage and chapter roles.
- Browser code and ordinary authenticated SSR/server operations use only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Signed-in user JWTs continue to resolve to the `authenticated` Postgres role, so RLS remains authoritative.
- `SUPABASE_SECRET_KEY` must be a current `sb_secret_...` key. It maps to `service_role`, bypasses RLS, and is available only through the explicitly server-only privileged client. It is never used for ordinary Member, Proctor, Admin, or Scholarship Chair requests.
- Secret keys and Resend credentials never appear in `NEXT_PUBLIC_*` variables, client components, browser bundles, logs, URLs, generated HTML, or API responses.
- Legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` variables are not supported by this repository.
- Mutations authenticate, authorize, validate with Zod, perform atomic database operations, and record audit events.
- Bootstrap secrets are random, expire, are stored only as hashes, and become unusable after successful initialization.
- Audit rows cannot be updated/deleted by application roles.
- Email webhooks verify signatures and are idempotent.
- Academic records have no public sharing path; logs and user-facing errors omit sensitive/provider detail.
- Production and development use separate projects and data. Demo data is synthetic.

Security review includes dependency audit, RLS regression tests, authorization tests, secret scanning, input/CSRF/session review, and testing with manually constructed requests.

## Supabase API-key boundary

| Component                                 | Key                                    | Database authorization                                                  |
| ----------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| Browser client                            | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `anon` before sign-in; `authenticated` with the user's JWT; RLS applies |
| Cookie-based server client and auth proxy | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Caller session; RLS applies                                             |
| Narrow privileged server utility          | `SUPABASE_SECRET_KEY`                  | `service_role`; RLS is bypassed                                         |

Code using the privileged client must perform its own authorization and input validation and document why RLS bypass is necessary. Creating a server action does not by itself justify using the secret key.
