const allowedProtocols = new Set(["http:", "https:"]);

function applicationOrigin(value: string) {
  const url = new URL(value);
  if (!allowedProtocols.has(url.protocol) || url.username || url.password) {
    throw new Error("Application URL must be an HTTP(S) origin.");
  }
  return url.origin;
}

export function getOAuthCallbackUrl(applicationUrl: string) {
  return new URL(
    "/auth/callback",
    applicationOrigin(applicationUrl),
  ).toString();
}

export function getTrustedCallbackRedirect(
  next: string | null,
  requestOrigin: string,
) {
  const origin = applicationOrigin(requestOrigin);
  const fallback = new URL("/", origin);

  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return fallback;
  }

  try {
    const destination = new URL(next, origin);
    return destination.origin === origin ? destination : fallback;
  } catch {
    return fallback;
  }
}
