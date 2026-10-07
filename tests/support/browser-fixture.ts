import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Opt-in, synthetic-only snapshots for manual browser layout checks. */
export function writeBrowserFixture(filename: string, markup: string) {
  const outputDirectory = process.env.UX_FIXTURE_OUTPUT_DIR;
  if (!outputDirectory) return;
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    join(outputDirectory, filename),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Synthetic UX verification</title><link rel="stylesheet" href="/app.css"></head><body>${markup}<p class="bg-amber-50 p-2 text-center text-sm">Synthetic UX fixture — no live backend or saves.</p><script>document.addEventListener("submit", function (event) { event.preventDefault(); });</script></body></html>`,
    "utf8",
  );
}
