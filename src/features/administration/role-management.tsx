import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { manageMemberRole } from "@/features/administration/actions";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const statusMessages: Record<string, string> = {
  assigned: "The operational role was assigned and audited.",
  removed: "The operational role was removed and audited.",
};

export async function RoleManagement({
  status,
  error,
}: {
  status?: string;
  error?: string;
}) {
  const context = await requireChairContext();
  const isChair = context.roles.includes("scholarship_chair");
  const supabase = await createClient();
  const { data: members, error: memberError } = await supabase
    .from("members")
    .select("id, full_name, status, profile_id, member_roles(role, active)")
    .eq("chapter_id", context.chapterId!)
    .order("full_name");
  if (memberError) throw new Error("Could not load chapter roles.");

  return (
    <div className="space-y-5">
      {status && statusMessages[status] && (
        <p
          role="status"
          className="rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]"
        >
          {statusMessages[status]}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          The role was not changed. The account may be unlinked or inactive, or
          your role may not permit this change.
        </p>
      )}
      {!isChair && (
        <p className="rounded-xl bg-[var(--warning-soft)] p-4 text-sm font-semibold text-[var(--warning)]">
          As an Admin, you can manage Proctors. Only the current Scholarship
          Chair can assign or remove Admin access.
        </p>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Chapter roles
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Operational roles can be granted only to active members with a
            connected Google account. The Member role and Scholarship Chair
            transfer are managed by their dedicated workflows.
          </p>
        </CardHeader>
        <div className="divide-y">
          {(members ?? []).map((member) => {
            const roles = new Set(
              (
                member.member_roles as Array<{
                  role: string;
                  active: boolean;
                }>
              )
                .filter((role) => role.active)
                .map((role) => role.role),
            );
            const isOperationallyEligible =
              member.status === "active" && Boolean(member.profile_id);
            const memberIsChair = roles.has("scholarship_chair");
            return (
              <article
                key={member.id}
                className="grid gap-4 p-5 xl:grid-cols-[minmax(14rem,1fr)_auto_auto] xl:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[var(--navy)]">
                      {member.full_name}
                    </p>
                    {memberIsChair && <Badge>Scholarship Chair</Badge>}
                    <Badge
                      tone={member.status === "active" ? "success" : "neutral"}
                    >
                      {member.status}
                    </Badge>
                    {!member.profile_id && (
                      <Badge tone="warning">Unlinked</Badge>
                    )}
                  </div>
                  {!isOperationallyEligible && (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Connect and activate this member before granting a role.
                    </p>
                  )}
                </div>
                <RoleControl
                  memberId={member.id}
                  label="Proctor"
                  role="proctor"
                  enabled={roles.has("proctor")}
                  canManage={isOperationallyEligible || roles.has("proctor")}
                />
                <RoleControl
                  memberId={member.id}
                  label="Admin"
                  role="admin"
                  enabled={roles.has("admin")}
                  canManage={
                    isChair &&
                    !memberIsChair &&
                    (isOperationallyEligible || roles.has("admin"))
                  }
                  unavailableLabel={!isChair ? "Chair only" : undefined}
                />
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function RoleControl({
  memberId,
  label,
  role,
  enabled,
  canManage,
  unavailableLabel,
}: {
  memberId: string;
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
      <form action={manageMemberRole}>
        <input type="hidden" name="memberId" value={memberId} />
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="enabled" value={String(!enabled)} />
        <Button
          type="submit"
          disabled={!canManage}
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
