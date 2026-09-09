# Deployment and external configuration

## Environments

Use separate Supabase and Vercel projects for Development and Production. Development may enable synthetic seed data and email mock mode. Never copy production academic data into routine development.

The canonical application origins are:

- Local development: `http://localhost:3000`
- Production: `https://sigma-nu-scholarship.vercel.app`

The Google login action constructs its redirect as `<NEXT_PUBLIC_APP_URL>/auth/callback`. The callback exchanges the one-time Supabase code for the cookie-backed session, accepts only a same-origin relative `next` destination, and otherwise returns to `/` on the callback request's own origin.

## Current Vercel configuration

Keep outbound email in mock mode until Resend webhook verification, delivery history, and retry behavior are complete.

| Variable                               | Vercel environments    | Exposure    | Source                                                                    |
| -------------------------------------- | ---------------------- | ----------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Production and Preview | Public      | Supabase Project Settings / Connect                                       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production and Preview | Public      | Supabase Project Settings -> API Keys -> Publishable key                  |
| `NEXT_PUBLIC_APP_URL`                  | Production and Preview | Public      | Exact deployed origin; Production is the canonical URL listed above       |
| `EMAIL_MODE`                           | Production and Preview | Server-only | Set to `mock` for the current deployment                                  |
| `EMAIL_FROM`                           | Production and Preview | Server-only | Synthetic sender while mock; later an address on a Resend-verified domain |
| `EMAIL_REPLY_TO`                       | Optional               | Server-only | A monitored chapter inbox                                                 |

Do not configure `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, or `RESEND_WEBHOOK_SECRET` while the current deployment remains in mock email mode. The Resend webhook route is dormant without its signing secret, and no ordinary Member/Admin/Chair application request uses the Supabase secret key. `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` are local-Supabase-CLI variables and must not be placed in Vercel; hosted provider credentials remain in the Supabase Dashboard.

When real email is deliberately enabled, add `EMAIL_MODE=production`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, and `SUPABASE_SECRET_KEY` as server-only Production variables. Configure the exact Resend webhook URL `https://sigma-nu-scholarship.vercel.app/api/webhooks/resend` and subscribe to email delivery events. The Supabase secret key is used only after webhook signature verification to call the service-role-only delivery recorder.

## Hosted OAuth URL configuration

In Supabase Authentication -> URL Configuration use:

- Site URL: `https://sigma-nu-scholarship.vercel.app`
- Redirect URL: `http://localhost:3000/auth/callback`
- Redirect URL: `https://sigma-nu-scholarship.vercel.app/auth/callback`

No wildcard is needed for the stable production deployment. Add a separate exact preview callback only when testing OAuth on a particular Vercel preview URL.

In the existing Google OAuth Web client use these Authorized JavaScript origins:

- `http://localhost:3000`
- `https://sigma-nu-scholarship.vercel.app`

Keep the Authorized redirect URI set to the hosted Supabase callback shown in Authentication -> Sign In / Providers -> Google. The Vercel application callback is a Supabase redirect destination, not a Google Authorized redirect URI.

## Required setup

1. Create a chapter-controlled Supabase project. In the project's Connect dialog or Settings -> API Keys, obtain a current publishable key (`sb_publishable_...`) and create a current secret key (`sb_secret_...`). Do not use the legacy JWT-shaped `anon` or `service_role` keys.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the application. Leave `SUPABASE_SECRET_KEY` unset unless a narrowly scoped privileged backend workflow requires it; if required later, store it only in server-side development/Vercel secret storage.
3. In Google Auth Platform, configure a Web application OAuth client and add the exact callback URL shown on the Supabase Google provider page as an Authorized redirect URI.
4. Add the application origin as an Authorized JavaScript origin. Configure the consent-screen Branding, Audience, and the `openid`, email, and profile scopes.
5. Enable Google in Supabase Authentication -> Sign In / Providers -> Google and enter the Google Client ID and Client Secret there. Add the application's `/auth/callback` URL to Supabase Authentication -> URL Configuration -> Redirect URLs and set the correct Site URL.
6. Create a chapter-controlled Resend account, verify the sender domain, and create an API key and webhook signing secret.
7. Create a Vercel project connected to the repository and add the variables listed in `.env.example`.
8. Generate a high-entropy one-time bootstrap token outside the repository. Insert only its SHA-256 hash and expiration into `public.bootstrap_tokens` through an authorized Supabase administrative session. Give the plaintext token to the initial Chair through a secure channel; the `/setup` wizard consumes it once. No bootstrap token environment variable is used.
9. Complete the in-app setup wizard and readiness checks.

Supabase Free is supported. Production should schedule application-level semester exports. Paid Supabase plans may provide stronger managed backup options but are not required.

## Release checks

Apply migrations in a staging/development project, run database tests, lint, typecheck, unit/integration/E2E tests, and production build. Verify OAuth callbacks, RLS, safe email mode, webhook signature handling, export restoration, and bootstrap invalidation before production data entry.

## Safe hosted-development linking workflow

Do this only after creating an empty hosted **development** project. Never use the real roster or academic data.

1. Run `npx supabase login`. The CLI opens a browser and stores its platform access token locally.
2. Confirm the development project ref from its Dashboard URL.
3. Run `npx supabase link --project-ref <development-project-ref>` and enter the project's database password when prompted. Do not put the password in shell history.
4. Run `npx supabase projects list` and verify the linked project before any remote write.
5. Run `npx supabase migration list --linked` and `npx supabase db push --linked --dry-run`.
6. Review the dry run, then run `npx supabase db push --linked` without `--include-seed`.
7. Run `npx supabase migration list --linked` again, generate/compare hosted types or schema metadata, and execute the synthetic hosted authorization test plan.

Never run `supabase db reset --linked` against a persistent hosted project. It drops remote user-created schema and data. Never pass `--include-seed` to the hosted project; `supabase/seed.sql` is local synthetic demonstration data.
