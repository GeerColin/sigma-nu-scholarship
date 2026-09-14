# Production fresh-load read reliability

Dates: 2026-09-13–2026-09-14 UTC. Scope: the approved UI is unchanged. No roster/academic import or database-record mutation is part of this investigation. One project lifecycle restart was explicitly approved and performed as a mitigation test.

## Current conclusion

The failure reproduced on the first fresh Dashboard navigation after diagnostic deployment `d2bebe9` / Vercel `HgDUu9MxPPcWQmbkWJAT7RKo8fuD`, twice more in the user-created clean browser session on refined deployment `1e94710` / Vercel `FKEgMf4ajSv927LsvajwN5cge969`, and again after the explicitly approved project restart. It is reliably classified as upstream Supabase HTTP 504, with gateway records independently corroborating the earlier incidents, not fixed. Supabase's internal reason for the timeouts is unknown. The restart did not eliminate the failure.

The two original generic errors now have corresponding Supabase gateway 504 records on their actual read endpoints. No evidence establishes missing cookies, client hydration, RLS denial, missing linkage, or a Vercel function timeout as their cause. Successful later loads cannot erase these failures.

## Correlated production evidence

Only safe operation/status/time metadata is retained; no gateway request query strings, headers, cookies, response bodies, identifiers, or academic records are copied into this report.

| Occurrence                       | Vercel invocation start (UTC) | Supabase gateway record (UTC) | Static endpoint                   | Gateway status |
| -------------------------------- | ----------------------------- | ----------------------------- | --------------------------------- | -------------: |
| Original academic-status error   | 2026-09-13 13:20:13.870       | 2026-09-13 13:20:14           | `/rest/v1/study_hour_assignments` |            504 |
| Original member-directory error  | 2026-09-13 13:32:57.809       | 2026-09-13 13:33:00           | `/rest/v1/members`                |            504 |
| Reproduced fresh Dashboard error | 2026-09-13 19:30:07.395       | 2026-09-13 19:30:08           | `/auth/v1/user`                   |            504 |

For the reproduced invocation, Vercel's safe diagnostic events at 19:30:13.430 UTC report operation `auth`, category `provider_unavailable`, HTTP 504, duration 5,107 ms, session state `unknown`, and no recognized database/transport code. Identity verification had not completed; chapter/academic reads were not reached. The browser rendered the fail-closed recovery boundary, although Vercel's streamed response status was 200. Error digest: `3270843173`.

Supabase's last-24-hours gateway error filter showed five 5xx records, all HTTP 504: the three above plus member-linkage at 04:23:02 UTC and JWKS at 04:20:11 UTC. Its visible Auth-service log had a completed JWKS request at 19:30:08 UTC but no corresponding completed `/user` operation or Auth-service 5xx. Absence of a log is not proof that the request never reached Auth; provider-side tracing is needed. These observations support a provider/gateway availability category across Auth and PostgREST, not an established internal database-pool, region, compute, or cold-start cause.

The request-error fallback initially lost the known error's category because Next.js/React processing or separate server chunks did not preserve prototype identity. It is corrected to recognize only the static `SupabaseReadFailure` marker plus an allowlisted category. Auth request diagnostics now distinguish user verification, token refresh, and JWKS using static operation names, never URLs. This improves diagnostic accuracy; it does not fix the upstream 504.

The clean-session run reproduced two failures on the refined deployment. These new cases are corroborated by Vercel's instrumented Supabase fetch boundary, not yet independently matched to new Supabase gateway log records:

| Clean-session route     | Vercel invocation start (UTC) | Operation     | HTTP status | Fetch duration | Session state | Error digest |
| ----------------------- | ----------------------------- | ------------- | ----------: | -------------: | ------------- | ------------ |
| Members                 | 2026-09-13 19:53:00.57        | `assignments` |         504 |       5,036 ms | `verified`    | `473495793`  |
| Synthetic Member Detail | 2026-09-13 19:55:00.95        | `auth_user`   |         504 |       5,884 ms | `unknown`     | `2990143442` |

Members threw the existing generic academic-status failure after the assignments response failed, despite successful identity verification. Member Detail threw the generic sign-in-verification failure before identity verification completed. Both rendered the existing recovery boundary; neither was retried before log correlation. Grouped invocation details contain `provider_unavailable` fetch/helper/request-error events. Runtime list summaries show only one message per invocation: warnings can be present inside an Error invocation even when the warnings-only list does not show that incident. Inspect grouped events across all levels; absence from a warnings-only summary is not absence of instrumentation.

## Online-source investigation and single restart mitigation

Reddit reports were checked as anecdotes, including [small/free projects with high I/O and an unresponsive Dashboard](https://www.reddit.com/r/Supabase/comments/1w8ub5h/continous_100_io_usage_and_non_responsive/) and [Auth/PostgREST failures despite a Healthy database](https://www.reddit.com/r/Supabase/comments/1utxtth/supabase_issue/). Neither establishes this project's internal cause. The relevant primary source is Supabase's September 10–11 [Unresponsive Projects incident](https://status.supabase.com/incidents/4mkcsnlf6p5x): Nano projects became unresponsive, the provider rolled out a fix, and it recommended restarting projects with lingering failures. The hosted project is Nano in us-west-2; its current snapshot was Healthy with CPU 3%, RAM 54%, and 9/60 connections. This snapshot does not exclude transient pressure. Several historical resource charts could not load, so I/O budget exhaustion was not established. The visible Disk percentage is storage usage, not evidence of exhausted I/O budget.

[Supabase's HTTP troubleshooting guide](https://supabase.com/docs/guides/troubleshooting/http-api-issues) identifies resource constraints as a potential cause and warns that a restart may only clear workloads temporarily. [PostgREST's pool documentation](https://postgrest.org/en/stable/references/connection_pool.html) associates acquisition timeout with `PGRST003`; that code was not captured in these incidents, so pool exhaustion remains unproven. Changing a direct-database pooler URL would not modify this application's ordinary HTTP Supabase read path. The earlier Member Detail Vercel invocation finished in approximately six seconds against a five-minute maximum; increasing its Vercel duration limit is not an indicated fix for that captured upstream 504. No compute upgrade, pool setting, authentication strategy, cache shortcut, retry loop, or RLS change was made based on community advice.

The user explicitly approved one restart after its downtime was explained. The agent submitted Restart once from the correct project's General settings at approximately 2026-09-13 20:10:12 UTC and observed Restarting. The project subsequently showed Healthy. The first counted post-restart navigation occurred at 2026-09-14 00:24:25 UTC, approximately four hours fourteen minutes later. No immediate post-restart navigation test was performed; do not describe this as an immediate recovery test. The same existing sessions remained authenticated without a new OAuth round trip.

Twenty-eight post-restart fresh navigations passed across seven required routes: seven in the user-created Opera session, seven in the in-app browser at 390×844, and two seven-route desktop rounds at 1366×768. The loaded deployment runtime-log view then showed zero Warning/Error/Fatal invocations in its current window. However, the 29th post-restart navigation, the Opera Dashboard return for handoff, failed. Subsequent grouped invocation events confirmed:

| Route                   | Vercel invocation start (UTC) | Static endpoint           | Operation | HTTP status | Fetch duration | Session state | Error digest |
| ----------------------- | ----------------------------- | ------------------------- | --------- | ----------: | -------------: | ------------- | ------------ |
| Dashboard after restart | 2026-09-14 00:30:36.91        | `/rest/v1/academic_weeks` | `week`    |         504 |       5,046 ms | `verified`    | `2644271829` |

The fetch/helper/request-error events classified the failure as `provider_unavailable`. This new instrumented case is not yet independently matched to a Supabase gateway log entry. The failed page was left untouched while correlating logs; no retry or second restart was performed. The temporary mobile/desktop viewport override was reset. A short successful log window or a long sequence of successful renders is not proof of a fix. Support-side tracing remains necessary.

## Code and dependency evidence

- `src/lib/auth/context.ts` verifies identity with `getUser()` before chapter/member lookup. React `cache()` scopes that context to the current server render; it does not share users between requests. Supabase clients are created inside request execution, not at module scope.
- `src/lib/supabase/proxy.ts` refreshes through `getClaims()` and forwards updated cookies to the incoming render and outgoing browser response. This is not the final authorization check; the server context still calls `getUser()` and RLS remains authoritative.
- The OAuth callback completes PKCE code exchange server-side before redirecting. The ordinary read path does not depend on a client-side hydration effect to authenticate.
- `getActiveAcademicPeriod()` is request-memoized and performs semester then current-week lookup. Member-directory reads wait for verified context and period before starting the four parallel academic queries. One historical failure occurred before that parallel group, so parallel academic queries alone are not an established explanation.
- Next.js 16.3.4's installed fetching/cookies documentation says default fetches are uncached and `cookies()` opts these routes into dynamic rendering. No ISR, `force-cache`, shared user-context cache, or cache-components flag was found in this path. No speculative cache/revalidation change was made to reads.
- The installed PostgREST SDK already retries some idempotent network failures and HTTP 503/520 responses with bounded backoff. Its final transport result can have status 0 and an empty code; response parsing errors can also become status 0. Status 0 alone therefore cannot prove a network failure. Diagnostics observe failed attempts without adding retries or inspecting response bodies.

Two implementation gaps corrected, without claiming either caused the historical incident:

1. Member/access-request lookup errors were silently ignored. A failed lookup now throws a generic fail-closed account-access error instead of looking like a legitimately unlinked account. Auth transport errors are distinguished from a confirmed missing/invalid session. Successful unlinked reads remain restricted.
2. The proxy ignored the installed SSR package's second `setAll` argument containing refresh-time cache-control headers. Those headers now survive response recreation and subsequent writes. This follows [Supabase's current SSR cache guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide); the installed `@supabase/ssr/src/types.ts` documents the same contract.

## Privacy-safe diagnostics

`src/lib/supabase/diagnostics.ts` is server-only. The `supabase_read_failure` JSON event emits only a fixed schema: schema version, unrelated ephemeral diagnostic/instance IDs, static render/proxy scope and operation, instance age, category, verified/missing/invalid/unknown session state, sanitized SQLSTATE/PostgREST code, recognized transport code, HTTP status, and attempt duration. The fetch boundary does not read response bodies. Provider strings may be inspected internally for recognized classifier tokens but are not retained in error causes or emitted.

Categories distinguish missing/invalid session, transport, provider unavailable, database/PostgREST, explicit RLS denial, other permission denial, missing visible member linkage, timeout, and unexpected application error. Guard/lookup errors remain plain and actionable to the browser. Next.js request-error instrumentation receives no request/context parameters and never logs the original error payload.

Important limitations:

- A successful empty member lookup means no _visible_ linkage; an RLS-hidden row cannot be distinguished from an absent row by that client. No bypass is used to resolve this ambiguity.
- HTTP 403 / SQLSTATE 42501 without explicit row-level-security evidence is permission denial, not proven RLS denial. Ordinary SELECT policy exclusion may return no rows rather than an error.
- Abort alone is transport cancellation, not a proven timeout. Statement cancellation alone is database cancellation, not a proven statement timeout. Only recognized timeout evidence is classified as timeout.
- A generic or React-processed server error lacking provider metadata is not proof of a specific application bug. Use the correlated request's boundary events to classify it.
- Instance age is diagnostic context, not proof of a Vercel cold start. Use [Vercel runtime invocation metadata](https://vercel.com/docs/logs/runtime) for the start type and runtime duration.
- Expected signed-out/unlinked states can generate diagnostic warnings; those warnings are not themselves authenticated page-read failures.
- HTTP 200 is not a pass criterion: an RSC stream can contain a rendered error boundary. Each attempt must verify the page heading and absence of Try again.

No credentials, headers, cookies (including names), URLs, query strings, response bodies, user/chapter/member IDs, names/emails, row counts, or academic data are logged. The existing generic error cause retains only static failed operation names and sanitized code/status.

## Verification and production attempts

Release gates passed: 132 unit tests across 22 files with one isolated worker; 182 local and 182 hosted rollback-only pgTAP/RLS checks across 13 files each; ESLint; strict TypeScript; repository formatting; production build; and whitespace verification. Diagnostic markers (`supabase_read_failure`, `transport_code`, `Read failures:`) are absent from `.next/static` browser bundles. Regression coverage includes the exact Auth HTTP 504 fail-closed path and category preservation after prototype identity is lost.

Seven baseline authenticated fresh navigations before the new deployment passed: Dashboard, Members, reserved synthetic Member Detail, This Week, Study Hours, Analytics, and Administration. No Try again/error boundary appeared. A browser automation selector wait timed out while the Study Hours heading was already visible; the subsequent direct DOM observation confirmed the page loaded. This automation deadline is not counted as an application read failure.

The first desktop (1366×768) fresh Dashboard navigation on `d2bebe9` failed and the stress run stopped for log correlation before any manual retry. The classification follow-up `1e94710` deployed successfully as Vercel `FKEgMf4ajSv927LsvajwN5cge969`; its Ready state, source commit, and stable production alias were verified.

Counted explicit fresh authenticated navigations so far (automatic OAuth redirects, prefetches, selector waits, and provider-console visits are not counted):

| Batch                                                           | Attempts | Passed | Failed |
| --------------------------------------------------------------- | -------: | -----: | -----: |
| Baseline, seven required routes                                 |        7 |      7 |      0 |
| First diagnostic deployment, fresh Dashboard                    |        1 |      0 |      1 |
| Refined deployment, desktop 1366×768, three seven-route rounds  |       21 |     21 |      0 |
| Refined deployment, mobile 390×844, three seven-route rounds    |       21 |     21 |      0 |
| After logout/Google login, seven required routes                |        7 |      7 |      0 |
| User-created clean Opera session, seven required routes         |        7 |      5 |      2 |
| Clean-session Dashboard return for handoff                      |        1 |      1 |      0 |
| Post-restart, user-created Opera session, seven required routes |        7 |      7 |      0 |
| Post-restart, mobile 390×844, seven required routes             |        7 |      7 |      0 |
| Post-restart, desktop 1366×768, two seven-route rounds          |       14 |     14 |      0 |
| Post-restart, Opera Dashboard return for handoff                |        1 |      0 |      1 |
| Total authenticated                                             |       94 |     90 |      4 |

Every seven-route round includes Dashboard, Members, reserved synthetic Member Detail, This Week, Study Hours, Analytics, and Administration. The repeated desktop/mobile rounds ran 19:39:56–19:41:47 UTC on September 13; after-login fresh loads ran 19:44:24–19:44:32 UTC. The existing approved account completed a real Google OAuth round trip and regained protected navigation without password/MFA entry by the agent. Post-restart route rounds ran 00:24:25–00:29:39 UTC on September 14, followed by the failed handoff return initiated at 00:30:29 UTC. Browser checks that initially observed loading were resolved through a later read of the same page, without another navigation; these are not additional attempts or automatic retries. Seven additional signed-out protected-route fresh navigations all showed the login page, with no chapter page rendered. Thus there are 101 explicit protected-route navigations: 94 authenticated and seven correctly denied signed-out navigations. OAuth landing itself is verified but excluded from this counter.

Follow-up runtime logs showed zero Error invocations and ten Warning invocations. The visible warning summaries were nine expected `session_missing` entries and one `provider_unavailable` entry: HTTP 504, duration 5,030 ms, session `verified`, operation `other_read`, in the This Week invocation starting 19:40:08.66 UTC. Code inspection identifies the This Week path's unmapped read as the existing noncritical chapter-display lookup in `ChairAppShell`; that component already falls back when this lookup fails. No new fallback or retry was added. This is **not** a failed academic-page render, but it proves provider timeouts continued on the refined deployment despite all 49 academic-page navigations there passing. Zero visible page errors does not mean every underlying read succeeded or that the provider issue is fixed.

Use one tab per already connected browser to limit RAM; no additional tabs were opened for this follow-up. Detail navigation targets only the existing reserved synthetic member fixture. Desktop and mobile viewport checks exercise responsive rendering, not separate browser identities. No academic, roster, approval, role, or application-configuration mutation occurred; only the requested account's session logout/login and the explicitly approved single project restart were exercised.

The user created and signed into a fresh browser session with the existing approved account, then explicitly identified the Dashboard tab as fresh after closing the other application tab. Opera's connector made that exact tab accessible. Isolation/private-window provenance is user-confirmed, not programmatically inspected; no cookies or browser storage were read. Seven explicit navigations ran 19:52:33–19:56:54 UTC: Dashboard, This Week, Study Hours, Analytics, and Administration passed; Members and synthetic Member Detail failed as classified above. An additional fresh Dashboard navigation at 19:57:16 UTC passed and left the user's single application tab ready for handoff. User-triggered login/landing before connection is excluded from the attempt counter. The connector provides no viewport-control capability for this Opera session; the earlier instrumented desktop/mobile rounds remain separately recorded. The temporary in-app diagnostic-browser viewport override was reset. Logout/login remains a separate test, not represented as isolated-session creation by the agent.

## Additional research and region mitigation — 2026-09-14

The selected post-restart failure's fetch diagnostic reports instance age 219,837 ms (about 3 minutes 40 seconds); this was not the module's first request immediately after initialization. Vercel reports a 6.48-second function invocation against a five-minute maximum and 62-ms middleware execution. This does not establish suspension/resumption behavior, but it weakens a first-invocation cold-start explanation and does not indicate Vercel execution-limit exhaustion.

Further primary-source research distinguishes non-matching remedies:

- [Supabase's serverless connection guide](https://supabase.com/docs/guides/troubleshooting/troubleshooting-connect_timeout-or-hanging-queries-in-vercel-serverless-functions-775f92) addresses persistent `postgres-js` sockets. Ordinary reads here already use its recommended HTTP Data API, and the failing deployment already uses Fluid compute; adding an ORM pool or `SELECT 1` preflight is not indicated.
- [Supabase's Auth 503 guide](https://supabase.com/docs/guides/troubleshooting/auth-error-503-authretryablefetcherror-51b88c) addresses invalid session-timebox configuration preventing Auth startup. Our intermittent HTTP 504s, including verified-session REST failures, do not match an Auth-wide initialization failure. No session lifetime was changed.
- [Supabase's retry guide](https://supabase.com/docs/guides/api/automatic-retries-in-supabase-js) cautions that retries can exhaust the Data API pool. The installed SDK source retries network rejection and HTTP 503/520 for idempotent methods; HTTP 504 is not in its installed retry-status allowlist. No retries were added or changed.
- [First-hand issue #47663](https://github.com/supabase/supabase/issues/47663) describes Auth/PostgREST failures persisting after restore. The reporter's pool/routing explanation is a hypothesis, not a confirmed fix or proof of our project's cause.

Unlike the earlier request's ingress location, deployment Resources now independently confirms Node.js function region `IAD1`, including Analytics. Supabase is in Oregon (`us-west-2`). [Vercel recommends function/database co-location](https://vercel.com/docs/regions), maps `pdx1` to `us-west-2`, and [allows a single selected region on Hobby](https://vercel.com/docs/project-configuration/vercel-json). Added `vercel.json` with exactly one function region, `pdx1`. No plan upgrade, database migration, failover region, RLS, credential, caching, timeout, retry, or visual behavior change is included. The installed Next.js documentation deprecates route-level `preferredRegion`; the hosting configuration uses the documented Vercel project setting instead.

This is an evidence-backed latency mitigation and controlled hosting-path experiment, **not an established root-cause fix**. A unit configuration regression guards the single Oregon region. Deployment and fresh-load results must be verified before assessing its effect; all earlier failures remain part of the cumulative evidence.

Region-change release checks passed: 133 unit tests in 23 files, 182 local pgTAP/RLS tests in 13 files, lint, strict TypeScript, repository formatting, production build, whitespace verification, and no diagnostic-marker matches in browser bundles. The first local database-test launch was sandbox-blocked on the CLI's user-level telemetry write; the approved rerun passed. SQL and authorization code are unchanged; the earlier 182 hosted rollback-only checks remain historical evidence, not a newly rerun hosted suite.

## Remaining risk and pilot recommendation

The failure class is confirmed upstream gateway/provider HTTP 504, across both Auth and ordinary RLS-aware PostgREST reads. The internal trigger remains unknown. The application continues to fail closed for identity/access/academic read failures; no RLS denial or unauthorized data access was observed in this task, and all 182 local/hosted RLS checks pass. These observations do not replace the separately deferred complete synthetic-account browser role matrix.

Do not claim a root-cause fix or unconditional pilot readiness. A real-member pilot is not recommended yet: the clean-session test reproduced two more provider failures on the refined deployment, and the academic-week failure recurred after the approved single restart. The next external action is to open a support request from the hosted project's Supabase Dashboard Help/Support controls. Ask Supabase to investigate the correlated gateway 504s on the three static endpoints above, the two instrumented clean-session failures, and the new `/rest/v1/academic_weeks` 504 after restart. Include UTC times, deployment identifiers, safe durations, and the restart time; mention the lack of a corresponding visible Auth `/user` completion in the earlier incident. Ask whether the project is still affected by the September Nano incident and request provider-side gateway/upstream tracing and resource/connection evidence before changing compute, regions, or connection settings. Do not attach raw HARs, request headers/cookies, response bodies, academic rows, or roster files. No secret/API-key change or privileged read workaround is indicated by this evidence.

## If it happens again

Record the UTC timestamp, route _template_ (for example Member Detail, not a member ID), whether this was a fresh navigation/reload, whether it followed login/logout, desktop/mobile size, and the generic error/digest if present. Do not collect a raw HAR, cookies, headers, response body, academic rows, or screenshots containing academic data.

In Vercel Runtime Logs for that exact deployment, collect only the safe `supabase_read_failure` events grouped with the failed invocation, their category/code/status/transport code/session state/duration, and the invocation's region/start type/runtime duration. A warning may be an SDK attempt that subsequently recovered; confirm a visible page failure before counting an incident. If provider/database evidence is present, compare the same time window with Supabase operational/error metadata without exporting query payloads or user data. This can distinguish auth/linkage, provider/transport, database/permission, timeout, and an unclassified application failure. If metadata is insufficient, keep the cause unknown rather than guessing.
