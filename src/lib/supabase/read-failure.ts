import "server-only";

type ReadResult = {
  operation: "members" | "submissions" | "assignments" | "sessions" | "alerts";
  error: { code?: unknown } | null;
  status?: number;
};

// Never retain provider messages, response bodies, URLs, headers, or row data.
// Next.js keeps this diagnostic cause server-side in production.
export function createReadFailure(message: string, reads: ReadResult[]): Error {
  const failures = reads
    .filter((read) => read.error)
    .map(({ operation, error, status }) => {
      const rawCode = error?.code;
      const code =
        typeof rawCode === "string" &&
        /^(?:[A-Z0-9]{5}|PGRST[0-9]{3})$/.test(rawCode)
          ? rawCode
          : "UNKNOWN";
      const httpStatus =
        Number.isInteger(status) && status! >= 0 && status! <= 599
          ? status
          : "UNKNOWN";
      return `${operation}[status=${httpStatus}, code=${code}]`;
    });

  return new Error(message, {
    cause: new Error(`Read failures: ${failures.join("; ")}`),
  });
}
