# Dedicated production setup — 2026-09-14

## Confirmed destinations

| Environment | Supabase project ref   | Region      | Status                                           |
| ----------- | ---------------------- | ----------- | ------------------------------------------------ |
| Development | `bryppeounpmtobjwwpfs` | `us-west-2` | Existing repository link; unchanged              |
| Production  | `bxxbegnexwopamxuknru` | `us-west-2` | Owner-created; Dashboard and CLI confirm Healthy |

Production project name: **Sigma Nu Scholarship Production**, organization **SigmaNu_Scholarship**. Hosted URL: `https://bxxbegnexwopamxuknru.supabase.co`. On September 14, the owner approved replacing the two public Vercel Supabase variables and redeploying. Production now uses this destination; Preview retains development.

## Migration setup

The isolated CLI workspace on this laptop is `C:\Users\geerc\VSCode_SigmaNu\supabase-production-cli`, outside the Git repository. Its `supabase/migrations` directory is a Windows junction pointing to the repository's canonical migration directory, not a copied or edited migration set. It contains no seeds or fixture directory. This local setup is not transferred by Git; recreate a separate CLI workspace deliberately on another machine rather than assuming it exists.

The isolated configuration uses project ID `sigma-nu-scholarship-production`, PostgreSQL 17, and local shadow port 55320. Windows reserves ports 54241–54340 on this machine, including the default shadow port 54320; 55320 was verified not reserved/listening. No Windows network/security setting was changed.

The production link succeeded using the CLI's existing platform login without capturing a database password. Initial migration history was empty. Reviewed `db push --linked --dry-run` listed exactly the 18 repository migrations and no seeds. Those migrations applied successfully; subsequent history matches versions `202609070001` through `202609090018`. No `--include-seed`, hosted reset, connected-workflow fixture import, roster import, or academic-record import was performed.

Always specify the isolated workspace for production commands. From the application repository, examples are:

```powershell
npx.cmd supabase --workdir ..\supabase-production-cli migration list --linked
npx.cmd supabase --workdir ..\supabase-production-cli db push --linked --dry-run
npx.cmd supabase --workdir ..\supabase-production-cli db diff --linked --schema public
npx.cmd supabase --workdir ..\supabase-production-cli test db --linked .\supabase\tests
```

Check the target reference before any remote write. **Run hosted CLI commands sequentially**, not concurrently: they initialize a shared temporary database-login role. Do not pass passwords in command arguments or enable debug logging for credential troubleshooting.

Initial verification was incomplete: five test files/87 checks passed before later connections failed authenticating the temporary CLI role and eventually encountered the pooler's authentication circuit breaker. Concurrent hosted CLI commands are a plausible cause; no RLS assertion failed. Separately, the schema comparison could not start its local shadow database on the Windows-reserved default port. Migration history still matched all 18 entries. Serialize verification and use the corrected isolated shadow port; do not treat the incomplete suite as 182 passes or this tooling failure as evidence of an application OAuth/RLS defect.

After all other hosted CLI commands finished, the complete suite reran sequentially and passed **182 checks across 13 files** on production, with all synthetic test transactions rolled back. This supports a CLI tooling/concurrency explanation for the initial authentication interruption, not a changed RLS policy or application fix. The prior shadow-comparison process's final result was not retained. A fresh sequential comparison with the corrected shadow port completed successfully: **No schema changes found** for `public`, including repository-defined RLS policies. No hosted DDL was changed by the comparison.

## Next owner configuration boundary

The Computer Use skill prohibits automating in-app security/privacy settings, so hosted authentication configuration must be completed by the owner or a suitable non-UI configuration workflow. Do not retrieve/reveal Google secrets through browser captures or chat.

1. In Google Auth Platform, open the existing Web OAuth client. Add `https://bxxbegnexwopamxuknru.supabase.co/auth/v1/callback` under **Authorized redirect URIs**. Keep the existing development callback; the two databases need distinct callbacks. The existing application origin stays `https://sigma-nu-scholarship.vercel.app`. Do not substitute the application's `/auth/callback` for Google's Supabase callback.
2. In the **new production Supabase project**, Authentication → Sign In / Providers → Google, configure the matching Google Client ID and Client Secret directly in that provider form, enable Google, and save. Use the owner's secure credential storage or Google client configuration; do not paste values into chat or Vercel. Do not rotate/delete a working development credential merely to configure production.
3. In production Supabase Authentication → URL Configuration, set Site URL to `https://sigma-nu-scholarship.vercel.app` and add exact Redirect URL `https://sigma-nu-scholarship.vercel.app/auth/callback`. No wildcard is required. Development/local callbacks remain in the development project.

These steps follow [Supabase's Google setup guidance](https://supabase.com/docs/guides/auth/social-login/auth-google). No provider/auth URL settings have been changed by the agent at this boundary.

The owner reported all three configurations saved. The production providers page independently showed Google Enabled. This is not a verified Google OAuth round trip against the new project. No client secret was requested, captured, or recorded.

## Cutover evidence and remaining initialization

Hosted schema/RLS comparison and rollback-only synthetic tests pass. The owner reports generating and privately saving the original one-time setup token, computing its SHA-256 hash locally, and registering that hash with a 24-hour expiration. The SQL insert was not independently inspected; no token or hash was captured by the agent. Never insert plaintext into SQL, log it, or paste it in chat.

Vercel's older shared public variables were write-only Secret entries. Scope-only editing was rejected because public-prefixed values must be Config. After explicit owner approval, only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` were deleted and recreated as separate Production/Preview Config entries. Saved public values were independently verified against each project's existing publishable key and URL. No new key was generated, no secret key was revealed, and `NEXT_PUBLIC_APP_URL`, `EMAIL_MODE`, and `EMAIL_FROM` were left unchanged. Local configuration and the development CLI link were not changed. See `DEPLOYMENT.md` for the full environment contract.

Deployment `Cgt49No7oXDV5Mfr2pn5RyC2PBJY` rebuilt the existing verified commit `f95aad678774e3e8e0dba17297f25d54552c6c86` with latest Production settings and without reusing the build cache. Vercel reports Ready, a 55-second build, and assignment of `sigma-nu-scholarship.vercel.app`. A direct `/setup` navigation correctly redirected to `/login`; Continue with Google reached Google's sign-in page. The existing browser tab was handed to the owner before credential/account selection. No new browser tab was created.

The fresh database does not inherit development Chair approval, member/profile linkage, semester, or settings. Next: the owner completes Google sign-in, opens `/setup`, and enters the privately saved **original token**, not its hash, to initialize the intended first Chair. If the token expired, register a newly generated token hash privately rather than sharing a token. Production OAuth completion, Chair initialization, and synthetic backup/recovery verification remain pending. No real roster or academic data was imported. Availability risk acceptance does not waive recovery/security checks before real-data entry.
