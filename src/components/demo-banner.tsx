import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="mb-5 flex items-center gap-2 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--warning)]">
      <FlaskConical className="size-4" /> Development demo · all names and
      academic data are synthetic
    </div>
  );
}
