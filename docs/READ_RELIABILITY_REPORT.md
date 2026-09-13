# Production fresh-load read reliability

Date: 2026-09-13. Scope: the approved UI is unchanged. No roster/academic import or database mutation is part of this investigation.

## Current conclusion

Investigation in progress. Historical production failures on 2026-09-13 are confirmed: member academic status at 13:20:13 UTC and member directory at 13:32:57 UTC. Both recovered through explicit Try again. Their original generic errors do not identify an underlying cause. Neither diagnostic improvements nor successful later loads prove a fix.

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

Release gates passed: 129 unit tests across 22 files with one isolated worker; 182 local and 182 hosted rollback-only pgTAP/RLS checks across 13 files each; ESLint; strict TypeScript; repository formatting; production build; and whitespace verification. Diagnostic markers (`supabase_read_failure`, `transport_code`, `Read failures:`) are absent from `.next/static` browser bundles.

Seven baseline authenticated fresh navigations before the new deployment passed: Dashboard, Members, reserved synthetic Member Detail, This Week, Study Hours, Analytics, and Administration. No Try again/error boundary appeared. A browser automation selector wait timed out while the Study Hours heading was already visible; the subsequent direct DOM observation confirmed the page loaded. This automation deadline is not counted as an application read failure.

Pending deployment verification and post-deployment stress results. Use one browser tab to limit RAM. Detail navigation targets only the existing reserved synthetic member fixture. Desktop and mobile viewport checks exercise responsive rendering, not separate browser identities.

A cold browser-session check requires a user-created clean browser session because the connector exposes no private/isolated-context capability. Logout/login is recorded separately, not represented as a cold-browser test.

## If it happens again

Record the UTC timestamp, route _template_ (for example Member Detail, not a member ID), whether this was a fresh navigation/reload, whether it followed login/logout, desktop/mobile size, and the generic error/digest if present. Do not collect a raw HAR, cookies, headers, response body, academic rows, or screenshots containing academic data.

In Vercel Runtime Logs for that exact deployment, collect only the safe `supabase_read_failure` events grouped with the failed invocation, their category/code/status/transport code/session state/duration, and the invocation's region/start type/runtime duration. A warning may be an SDK attempt that subsequently recovered; confirm a visible page failure before counting an incident. If provider/database evidence is present, compare the same time window with Supabase operational/error metadata without exporting query payloads or user data. This can distinguish auth/linkage, provider/transport, database/permission, timeout, and an unclassified application failure. If metadata is insufficient, keep the cause unknown rather than guessing.
