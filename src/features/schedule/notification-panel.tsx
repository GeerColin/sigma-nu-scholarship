import Link from "next/link";
import { Bell } from "lucide-react";
import { markStudyScheduleNotificationRead } from "@/features/schedule/actions";
import type { ScheduleNotification } from "@/features/schedule/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

function stateValue(state: Record<string, unknown>, key: string) {
  const value = state[key];
  return typeof value === "string" && value ? value : "—";
}

export function ScheduleNotificationPanel({
  notifications,
}: {
  notifications: ScheduleNotification[];
}) {
  const unread = notifications.filter((notification) => !notification.readAt);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-[var(--navy)]" aria-hidden="true" />
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Schedule changes
          </h2>
        </div>
        <Badge tone={unread.length ? "warning" : "neutral"}>
          {unread.length} unread
        </Badge>
      </CardHeader>
      <CardContent>
        {!notifications.length ? (
          <p className="text-sm text-[var(--muted)]">
            No proctor schedule changes have been recorded.
          </p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-xl border p-4 ${notification.readAt ? "opacity-70" : ""}`}
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                  <div>
                    <p className="font-semibold text-[var(--navy)]">
                      {notification.actorName} changed{" "}
                      {stateValue(notification.afterState, "session_date")}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {stateValue(notification.beforeState, "start_time")}–
                      {stateValue(notification.beforeState, "end_time")} at{" "}
                      {stateValue(notification.beforeState, "location")} →{" "}
                      {stateValue(notification.afterState, "start_time")}–
                      {stateValue(notification.afterState, "end_time")} at{" "}
                      {stateValue(notification.afterState, "location")}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(notification.createdAt))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={
                        `/schedule?date=${stateValue(notification.afterState, "session_date")}#occurrence-${notification.occurrenceId}` as never
                      }
                      className="text-sm font-semibold text-[var(--navy)] underline"
                    >
                      View
                    </Link>
                    {!notification.readAt && (
                      <form action={markStudyScheduleNotificationRead}>
                        <input
                          type="hidden"
                          name="notificationId"
                          value={notification.id}
                        />
                        <SubmitButton
                          className="bg-transparent px-2 text-sm text-[var(--navy)] shadow-none ring-1 ring-[var(--border)] hover:bg-[var(--surface-subtle)]"
                          pendingLabel="…"
                        >
                          Mark read
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
