import "server-only";

import { cache } from "react";

export type FailureCategory =
  | "session_missing"
  | "session_invalid"
  | "transport"
  | "provider_unavailable"
  | "database"
  | "rls_denial"
  | "permission_denied"
  | "missing_linkage"
  | "timeout"
  | "unexpected_application";

export type DiagnosticOperation =
  | "auth"
  | "member_linkage"
  | "access_request"
  | "members"
  | "submissions"
  | "assignments"
  | "sessions"
  | "alerts"
  | "semester"
  | "week"
  | "courses"
  | "custom_reviews"
  | "other_read"
  | "render";

type ProviderError = {
  code?: unknown;
  name?: unknown;
  message?: unknown;
  details?: unknown;
  cause?: unknown;
  status?: unknown;
  category?: unknown;
};

function fields(error: unknown): ProviderError {
  return typeof error === "object" && error !== null ? error : {};
}

// Inspect only to classify. Never retain or emit provider strings, even on error.
export function classifyFailure(
  error: unknown,
  status?: number,
): FailureCategory {
  const value = fields(error);
  if (error instanceof ReadFailure) return error.category;
  const cause = fields(value.cause);
  const message = typeof value.message === "string" ? value.message : "";
  const details = typeof value.details === "string" ? value.details : "";
  const codes = [value.code, cause.code];
  // The SDK also converts response JSON parsing failures into status=0. That
  // status alone is not proof of a transport failure.
  if (status === 0 && /^SyntaxError:/.test(message))
    return "unexpected_application";
  if (
    value.name === "TimeoutError" ||
    value.code === "PGRST003" ||
    codes.some((code) =>
      [
        "ETIMEDOUT",
        "UND_ERR_CONNECT_TIMEOUT",
        "UND_ERR_HEADERS_TIMEOUT",
        "UND_ERR_BODY_TIMEOUT",
      ].includes(String(code)),
    ) ||
    (value.code === "57014" && /statement timeout/i.test(message)) ||
    (status === 0 &&
      /TimeoutError|UND_ERR_(?:CONNECT|HEADERS|BODY)_TIMEOUT|ETIMEDOUT/.test(
        message + details,
      ))
  )
    return "timeout";
  if (
    value.name === "AuthSessionMissingError" ||
    value.code === "session_not_found"
  )
    return "session_missing";
  if (
    [
      "bad_jwt",
      "refresh_token_not_found",
      "refresh_token_already_used",
      "PGRST301",
      "PGRST303",
    ].includes(String(value.code)) ||
    status === 401
  )
    return "session_invalid";
  if (value.code === "42501" && /row[- ]level security/i.test(message))
    return "rls_denial";
  if (value.code === "42501" || status === 403) return "permission_denied";
  if ([502, 503, 504, 520, 521, 522, 523, 524].includes(status ?? -1))
    return "provider_unavailable";
  if (
    status === 0 ||
    value.name === "AuthRetryableFetchError" ||
    value.name === "AbortError" ||
    codes.some((code) =>
      [
        "ECONNRESET",
        "ECONNREFUSED",
        "ENOTFOUND",
        "EAI_AGAIN",
        "UND_ERR_SOCKET",
        "UND_ERR_HEADERS_OVERFLOW",
      ].includes(String(code)),
    ) ||
    (value.name === "TypeError" &&
      /fetch failed|failed to fetch/i.test(message))
  )
    return "transport";
  if (
    (typeof value.code === "string" &&
      /^(?:(?:[0-9][0-9A-Z]|P0|HV|XX|F0)[A-Z0-9]{3}|PGRST[0-9]{3})$/.test(
        value.code,
      )) ||
    (status !== undefined && status >= 400)
  )
    return "database";
  return "unexpected_application";
}

export class ReadFailure extends Error {
  constructor(
    message: string,
    public readonly category: FailureCategory,
    cause?: Error,
  ) {
    super(message, { cause });
    this.name = "SupabaseReadFailure";
  }
}

export function safeCode(error: unknown): string {
  const code = fields(error).code;
  return typeof code === "string" &&
    /^(?:(?:[0-9][0-9A-Z]|P0|HV|XX|F0)[A-Z0-9]{3}|PGRST[0-9]{3})$/.test(code)
    ? code
    : "UNKNOWN";
}

export function safeStatus(status?: number): number | "UNKNOWN" {
  return Number.isInteger(status) && status! >= 0 && status! <= 599
    ? status!
    : "UNKNOWN";
}

const transportCodes = [
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_SOCKET",
  "UND_ERR_HEADERS_OVERFLOW",
  "ABORT_ERR",
] as const;
function safeTransportCode(error: unknown): string {
  const value = fields(error);
  const cause = fields(value.cause);
  for (const code of transportCodes) {
    if (
      value.code === code ||
      cause.code === code ||
      [value.message, value.details].some(
        (text) =>
          typeof text === "string" && new RegExp(`\\b${code}\\b`).test(text),
      )
    )
      return code;
  }
  return "UNKNOWN";
}

const instanceId = crypto.randomUUID();
const instanceStartedAt = performance.now();

export function createDiagnosticState(scope: "render" | "proxy" = "render") {
  return {
    id: crypto.randomUUID(),
    scope,
    session: "unknown" as "unknown" | "verified" | "missing" | "invalid",
  };
}
export const getReadDiagnosticState = cache(() => createDiagnosticState());

export function recordFailure(
  operation: DiagnosticOperation,
  category: FailureCategory,
  error?: unknown,
  status?: number,
  durationMs?: number,
  state = getReadDiagnosticState(),
) {
  // Construct explicitly, never spread error/request/context/response objects.
  // No cookies (including names), headers, URLs, identifiers, row counts or rows.
  console.warn(
    JSON.stringify({
      event: "supabase_read_failure",
      version: 1,
      diagnostic_id: state.id,
      instance_id: instanceId,
      scope: state.scope,
      instance_age_ms: Math.round(performance.now() - instanceStartedAt),
      operation,
      category,
      session: state.session,
      code: safeCode(error),
      transport_code: safeTransportCode(error),
      status: safeStatus(status),
      duration_ms:
        typeof durationMs === "number" && Number.isFinite(durationMs)
          ? Math.max(0, Math.round(durationMs))
          : null,
    }),
  );
}

function operationFor(input: Parameters<typeof fetch>[0]): DiagnosticOperation {
  try {
    const path = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    ).pathname;
    if (path.startsWith("/auth/")) return "auth";
    const table = path.split("/").at(-1);
    const operations: Record<string, DiagnosticOperation> = {
      members: "members",
      access_requests: "access_request",
      semesters: "semester",
      academic_weeks: "week",
      grade_submissions: "submissions",
      study_hour_assignments: "assignments",
      study_sessions: "sessions",
      academic_alerts: "alerts",
      courses: "courses",
      custom_grading_reviews: "custom_reviews",
    };
    return operations[table ?? ""] ?? "other_read";
  } catch {
    return "other_read";
  }
}

// Observe failed HTTP attempts without reading bodies or changing fetch/retry/cache
// behavior. The installed PostgREST SDK already retries some GET transport errors.
export function diagnosticFetch(
  state = getReadDiagnosticState(),
  fetcher: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    const started = performance.now();
    const operation = operationFor(input);
    try {
      const response = await fetcher(input, init);
      if (!response.ok)
        recordFailure(
          operation,
          classifyFailure(null, response.status),
          null,
          response.status,
          performance.now() - started,
          state,
        );
      return response;
    } catch (error) {
      recordFailure(
        operation,
        classifyFailure(error),
        error,
        undefined,
        performance.now() - started,
        state,
      );
      throw error;
    }
  };
}
