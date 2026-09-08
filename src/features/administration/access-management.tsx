import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  approveAccessRequest,
  disconnectMemberAccount,
  rejectAccessRequest,
} from "@/features/administration/actions";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

type AccessManagementProps = {
  status?: string;
  error?: string;
};

const statusMessages: Record<string, string> = {
  approved: "The Google account was linked to the selected member.",
  rejected: "The access request was rejected.",
  disconnected: "The Google account was disconnected from the member.",
};

export async function AccessManagement({
  status,
  error,
}: AccessManagementProps) {
  const context = await requireChairContext();
  const supabase = await createClient();
  const [
    { data: requests, error: requestError },
    { data: members, error: memberError },
  ] = await Promise.all([
    supabase
      .from("access_requests")
      .select(
        "id, requested_name, authenticated_name, authenticated_email, status, rejection_reason, created_at, reviewed_at, possible_member_id",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("members")
      .select(
        "id, full_name, status, profile_id, profiles(email, display_name), member_roles(role, active)",
      )
      .eq("chapter_id", context.chapterId!)
      .order("full_name"),
  ]);

  if (requestError || memberError) {
    throw new Error("Could not load account management data.");
  }

  const pending = (requests ?? []).filter(
    (request) => request.status === "pending",
  );
  const availableMembers = (members ?? []).filter(
    (member) => !member.profile_id,
  );
  const connectedMembers = (members ?? []).filter(
    (member) => member.profile_id,
  );

  return (
    <div className="space-y-6">
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
          We couldn’t complete that account change. Nothing was changed. Check
          the request and try again.
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--navy)]">
                Pending requests
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Compare the authenticated Google identity with the requested
                roster name before linking.
              </p>
            </div>
            <Badge tone={pending.length ? "warning" : "success"}>
              {pending.length} pending
            </Badge>
          </div>
        </CardHeader>
        <div className="divide-y">
          {pending.map((request) => (
            <article key={request.id} className="space-y-5 p-5">
              <dl className="grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-sm font-semibold text-[var(--muted)]">
                    Requested roster name
                  </dt>
                  <dd className="mt-1 font-bold text-[var(--navy)]">
                    {request.requested_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-[var(--muted)]">
                    Google name
                  </dt>
                  <dd className="mt-1">
                    {request.authenticated_name || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-[var(--muted)]">
                    Google email
                  </dt>
                  <dd className="mt-1 break-all">
                    {request.authenticated_email}
                  </dd>
                </div>
              </dl>

              <div className="grid gap-4 lg:grid-cols-2">
                <form action={approveAccessRequest} className="space-y-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <label className="block">
                    <span className="mb-1.5 block font-semibold">
                      Link to existing member
                    </span>
                    <select
                      name="memberId"
                      required
                      defaultValue=""
                      className="min-h-11 w-full rounded-xl border bg-white px-3"
                    >
                      <option value="" disabled>
                        Select an unconnected member
                      </option>
                      {availableMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name} · {member.status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button type="submit" disabled={!availableMembers.length}>
                    Approve and link
                  </Button>
                </form>

                <form action={rejectAccessRequest} className="space-y-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <label className="block">
                    <span className="mb-1.5 block font-semibold">
                      Rejection reason
                    </span>
                    <input
                      name="reason"
                      required
                      minLength={2}
                      maxLength={500}
                      className="min-h-11 w-full rounded-xl border px-3"
                      placeholder="Reason recorded in the audit log"
                    />
                  </label>
                  <Button
                    type="submit"
                    className="bg-transparent text-[var(--danger)] shadow-none ring-1 ring-[var(--border)] hover:bg-[var(--danger-soft)]"
                  >
                    Reject request
                  </Button>
                </form>
              </div>
            </article>
          ))}
          {!pending.length && (
            <p className="p-8 text-center text-[var(--muted)]">
              No pending access requests.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Account connections
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Disconnecting an identity preserves the member and all academic
            history.
          </p>
        </CardHeader>
        <div className="divide-y">
          {connectedMembers.map((member) => {
            const profile = member.profiles as unknown as {
              email: string;
              display_name: string | null;
            } | null;
            const isChair = (
              member.member_roles as Array<{ role: string; active: boolean }>
            ).some((role) => role.role === "scholarship_chair" && role.active);
            return (
              <article
                key={member.id}
                className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr] lg:items-end"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[var(--navy)]">
                      {member.full_name}
                    </p>
                    <Badge tone="success">Connected</Badge>
                    {isChair && <Badge>Scholarship Chair</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {profile?.display_name || "Google name unavailable"} ·{" "}
                    {profile?.email || "Email unavailable"}
                  </p>
                </div>
                <form action={disconnectMemberAccount} className="flex gap-3">
                  <input type="hidden" name="memberId" value={member.id} />
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Disconnection reason</span>
                    <input
                      name="reason"
                      required
                      minLength={2}
                      maxLength={500}
                      disabled={isChair}
                      className="min-h-11 w-full rounded-xl border px-3"
                      placeholder={
                        isChair
                          ? "Transfer the Chair role before disconnecting"
                          : "Reason for disconnection"
                      }
                    />
                  </label>
                  <Button
                    type="submit"
                    disabled={isChair}
                    className="bg-transparent text-[var(--danger)] shadow-none ring-1 ring-[var(--border)] hover:bg-[var(--danger-soft)]"
                  >
                    Disconnect
                  </Button>
                </form>
              </article>
            );
          })}
          {!connectedMembers.length && (
            <p className="p-8 text-center text-[var(--muted)]">
              No Google accounts are currently connected.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
