# Deployment and external configuration

## Environments

Use separate Supabase and Vercel projects for Development and Production. Development may enable synthetic seed data and email mock mode. Never copy production academic data into routine development.

## Required setup

1. Create a chapter-controlled Supabase project. In the project's Connect dialog or Settings -> API Keys, obtain a current publishable key (`sb_publishable_...`) and create a current secret key (`sb_secret_...`). Do not use the legacy JWT-shaped `anon` or `service_role` keys.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the application. Leave `SUPABASE_SECRET_KEY` unset unless a narrowly scoped privileged backend workflow requires it; if required later, store it only in server-side development/Vercel secret storage.
3. In Google Auth Platform, configure a Web application OAuth client and add the exact callback URL shown on the Supabase Google provider page as an Authorized redirect URI.
4. Add the application origin as an Authorized JavaScript origin. Configure the consent-screen Branding, Audience, and the `openid`, email, and profile scopes.
5. Enable Google in Supabase Authentication -> Sign In / Providers -> Google and enter the Google Client ID and Client Secret there. Add the application's `/auth/callback` URL to Supabase Authentication -> URL Configuration -> Redirect URLs and set the correct Site URL.
6. Create a chapter-controlled Resend account, verify the sender domain, and create an API key and webhook signing secret.
7. Create a Vercel project connected to the repository and add the variables listed in `.env.example`.
8. Generate a one-time bootstrap token with the documented administrative script/secure deployment flow. Configure only its hash server-side, use it once, and remove it after initialization.
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
