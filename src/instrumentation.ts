import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error) => {
  // Deliberately do not receive/log request headers/path or the original error.
  // Detailed provider classification is emitted at the server-client boundary.
  const { classifyFailure, recordFailure } =
    await import("@/lib/supabase/diagnostics");
  recordFailure("render", classifyFailure(error));
};
