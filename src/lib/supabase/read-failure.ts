import "server-only";
import {
  classifyFailure,
  recordFailure,
  safeCode,
  safeStatus,
  ReadFailure,
  type DiagnosticOperation,
} from "@/lib/supabase/diagnostics";

type ReadResult = {
  operation: DiagnosticOperation;
  error: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    name?: unknown;
  } | null;
  status?: number;
};

// Never retain provider messages, response bodies, URLs, headers, or row data.
// Next.js keeps this diagnostic cause server-side in production.
export function createReadFailure(message: string, reads: ReadResult[]): Error {
  const failures = reads
    .filter((read) => read.error)
    .map(({ operation, error, status }) => {
      recordFailure(operation, classifyFailure(error, status), error, status);
      const code = safeCode(error);
      const httpStatus = safeStatus(status);
      return `${operation}[status=${httpStatus}, code=${code}]`;
    });

  const first = reads.find((read) => read.error);
  return new ReadFailure(
    message,
    classifyFailure(first?.error, first?.status),
    new Error(`Read failures: ${failures.join("; ")}`),
  );
}
