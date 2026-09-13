import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { transferScholarshipChair } from "@/features/administration/actions";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function HandoffWizard({ error }: { error?: string }) {
  const context = await requireChairContext();
  if (!context.roles.includes("scholarship_chair")) {
    return (
      <Card>
        <CardContent>
          <p className="font-bold text-[var(--navy)]">Chair-only workflow</p>
          <p className="mt-2 text-[var(--muted)]">
            Admins may review administration data, but only the current
            Scholarship Chair can transfer the Chair role.
          </p>
        </CardContent>
      </Card>
    );
  }

  const supabase = await createClient();
  const [
    { data: members, error: memberError },
    { data: semesters, error: semesterError },
    { count: pendingCount, error: requestError },
    { count: failedEmailCount, error: emailError },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("id, full_name, status, profile_id, member_roles(role, active)")
      .eq("chapter_id", context.chapterId!)
      .order("full_name"),
    supabase
      .from("semesters")
      .select("id, name, active")
      .eq("chapter_id", context.chapterId!),
    supabase
      .from("access_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("email_messages")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", context.chapterId!)
      .in("state", ["failed", "bounced"]),
  ]);
  if (memberError || semesterError || requestError || emailError) {
    throw new Error("Could not run handoff readiness checks.");
  }

  const current = (members ?? []).find(
    (member) => member.id === context.memberId,
  );
  const currentRoles = new Set(
    ((current?.member_roles ?? []) as Array<{ role: string; active: boolean }>)
      .filter((role) => role.active)
      .map((role) => role.role),
  );
  const candidates = (members ?? []).filter(
    (member) =>
      member.id !== context.memberId &&
      member.status === "active" &&
      member.profile_id &&
      (member.member_roles as Array<{ role: string; active: boolean }>).some(
        (role) => role.role === "member" && role.active,
      ),
  );
  const readiness = [
    {
      label: "Eligible activated successor available",
      ready: candidates.length > 0,
    },
    {
      label: "Active semester configured",
      ready: (semesters ?? []).some((semester) => semester.active),
    },
    {
      label: "No pending account requests",
      ready: (pendingCount ?? 0) === 0,
    },
    {
      label: "No failed email deliveries",
      ready: (failedEmailCount ?? 0) === 0,
    },
  ];

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          The Chair role was not transferred. No role changes were kept.
        </p>
      )}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Readiness checks
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Warnings do not block a deliberate transfer, but review them with
            the successor first.
          </p>
        </CardHeader>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {readiness.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-xl border p-3"
            >
              <span className="text-sm font-semibold">{item.label}</span>
              <Badge tone={item.ready ? "success" : "warning"}>
                {item.ready ? "Ready" : "Review"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Transfer Scholarship Chair
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            The selected successor becomes the only Scholarship Chair. If the
            transfer cannot finish safely, neither person’s access changes.
          </p>
        </CardHeader>
        <CardContent>
          <form action={transferScholarshipChair} className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block font-semibold">
                Activated successor
              </span>
              <select
                name="successorMemberId"
                required
                defaultValue=""
                className="min-h-11 w-full rounded-xl border bg-white px-3"
              >
                <option value="" disabled>
                  Select an active, connected member
                </option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.full_name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="rounded-xl border p-4">
              <legend className="px-2 font-semibold">
                Your access after handoff
              </legend>
              <input type="hidden" name="outgoingRoles" value="member" />
              <p className="mb-3 text-sm text-[var(--muted)]">
                You will remain a Member. Choose whether to retain existing
                lower operational roles.
              </p>
              {(["proctor", "admin"] as const).map((role) => (
                <label
                  key={role}
                  className="mr-5 inline-flex items-center gap-2 capitalize"
                >
                  <input
                    type="checkbox"
                    name="outgoingRoles"
                    value={role}
                    defaultChecked={currentRoles.has(role)}
                    disabled={!currentRoles.has(role)}
                  />
                  {role}
                </label>
              ))}
            </fieldset>
            <label className="flex items-start gap-3 rounded-xl bg-[var(--warning-soft)] p-4">
              <input
                type="checkbox"
                name="confirmed"
                value="yes"
                required
                className="mt-1 size-4"
              />
              <span className="text-sm font-semibold">
                I have reviewed the successor and understand that only they can
                transfer the Scholarship Chair role after this completes.
              </span>
            </label>
            <Button
              type="submit"
              disabled={!candidates.length}
              className="bg-[var(--danger)] hover:bg-red-800"
            >
              Transfer Scholarship Chair role
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
