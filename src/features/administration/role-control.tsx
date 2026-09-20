import { Button } from "@/components/ui/button";
import { manageMemberRole } from "@/features/administration/actions";

export function RoleControl({
  memberId,
  memberName,
  label,
  role,
  enabled,
  canManage,
  unavailableLabel,
}: {
  memberId: string;
  memberName: string;
  label: string;
  role: "proctor" | "admin";
  enabled: boolean;
  canManage: boolean;
  unavailableLabel?: string;
}) {
  return (
    <div className="flex min-w-44 items-center justify-between gap-3 rounded-xl border p-3">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-[var(--muted)]">
          {enabled ? "Assigned" : unavailableLabel || "Not assigned"}
        </p>
      </div>
      <form action={manageMemberRole} className="space-y-2">
        <input type="hidden" name="memberId" value={memberId} />
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="enabled" value={String(!enabled)} />
        {role === "admin" && canManage && (
          <label className="flex max-w-48 items-start gap-2 text-sm text-[var(--muted)]">
            <input type="checkbox" required className="mt-1" />
            <span>
              Confirm {enabled ? "removing" : "assigning"} Admin access.
            </span>
          </label>
        )}
        <Button
          type="submit"
          disabled={!canManage}
          aria-label={`${enabled ? "Remove" : "Assign"} ${label} role ${enabled ? "from" : "to"} ${memberName}`}
          className={
            enabled
              ? "bg-transparent text-[var(--danger)] shadow-none ring-1 ring-[var(--border)] hover:bg-[var(--danger-soft)]"
              : ""
          }
        >
          {enabled ? "Remove" : "Assign"}
        </Button>
      </form>
    </div>
  );
}
