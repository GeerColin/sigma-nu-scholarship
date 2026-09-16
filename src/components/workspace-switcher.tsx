import Link from "next/link";
import { ChevronDown, Crown, ShieldCheck, UserRound } from "lucide-react";

type Workspace = "member" | "proctor" | "chair";

const workspaceDetails: Record<
  Workspace,
  { label: string; shortLabel: string; href: string; icon: typeof UserRound }
> = {
  member: {
    label: "Member view",
    shortLabel: "Member",
    href: "/member",
    icon: UserRound,
  },
  proctor: {
    label: "Proctor view",
    shortLabel: "Proctor",
    href: "/proctor",
    icon: ShieldCheck,
  },
  chair: {
    label: "Scholarship Chair view",
    shortLabel: "Scholarship Chair",
    href: "/",
    icon: Crown,
  },
};

export function WorkspaceSwitcher({
  active,
  canProctor,
  canChair,
}: {
  active: Workspace;
  canProctor: boolean;
  canChair: boolean;
}) {
  const available: Workspace[] = [
    "member",
    ...(canProctor ? (["proctor"] as const) : []),
    ...(canChair ? (["chair"] as const) : []),
  ];

  if (available.length < 2) return null;

  const current = workspaceDetails[active];
  const CurrentIcon = current.icon;

  return (
    <details className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white px-3 text-left text-sm font-semibold text-[var(--navy)] shadow-sm marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <CurrentIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">{current.shortLabel}</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
      </summary>
      <div className="absolute top-12 right-0 z-40 grid w-64 gap-1 rounded-xl border border-[var(--line)] bg-white p-2 shadow-xl lg:right-auto lg:left-0">
        <p className="px-3 py-2 text-xs font-bold tracking-[0.12em] text-[var(--muted)] uppercase">
          Switch workspace
        </p>
        {available.map((workspace) => {
          const item = workspaceDetails[workspace];
          const Icon = item.icon;
          const isActive = workspace === active;
          return (
            <Link
              key={workspace}
              href={item.href as never}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold ${isActive ? "bg-[var(--surface-subtle)] text-[var(--navy)]" : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--navy)]"}`}
            >
              <Icon aria-hidden="true" className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
