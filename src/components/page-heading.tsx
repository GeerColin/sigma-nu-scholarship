import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-1 text-sm font-bold tracking-[0.16em] text-[var(--warning)] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-[var(--navy)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">{description}</p>
      </div>
      {action}
    </div>
  );
}
