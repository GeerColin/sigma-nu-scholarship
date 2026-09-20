import {
  createScheduleSeries,
  removeScheduleSeries,
  updateScheduleSeries,
} from "@/features/schedule/actions";
import { getScheduleManagementData } from "@/features/schedule/queries";
import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import { requireChairContext } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export async function ScheduleManager({
  status,
  error,
}: {
  status?: string;
  error?: string;
}) {
  const context = await requireChairContext();
  const period = await getActiveAcademicPeriod(context.chapterId!);
  if (!period) {
    return (
      <Card>
        <CardContent>
          <p className="text-[var(--muted)]">
            Create and activate a semester before adding recurring sessions.
          </p>
        </CardContent>
      </Card>
    );
  }
  const data = await getScheduleManagementData(
    context.chapterId!,
    period.semester.id,
  );
  return (
    <div className="space-y-5">
      {status && (
        <p
          role="status"
          className="rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]"
        >
          The schedule change was saved.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
        >
          The schedule change was not saved. Check the dates, assignments, and
          active member roles.
        </p>
      )}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Add recurring session
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            New sessions are generated only within the active semester:{" "}
            {period.semester.name}.
          </p>
        </CardHeader>
        <CardContent>
          <form
            action={createScheduleSeries}
            className="grid gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="semesterId" value={period.semester.id} />
            <label>
              <span className="mb-1 block font-semibold">Weekday</span>
              <select
                name="dayOfWeek"
                defaultValue="1"
                className="min-h-11 w-full rounded-xl border bg-white px-3"
              >
                {weekdays.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-1 block font-semibold">Start</span>
                <input
                  name="startTime"
                  type="time"
                  required
                  className="min-h-11 w-full rounded-xl border px-3"
                />
              </label>
              <label>
                <span className="mb-1 block font-semibold">End</span>
                <input
                  name="endTime"
                  type="time"
                  required
                  className="min-h-11 w-full rounded-xl border px-3"
                />
              </label>
            </div>
            <label>
              <span className="mb-1 block font-semibold">Location</span>
              <input
                name="location"
                required
                maxLength={200}
                className="min-h-11 w-full rounded-xl border px-3"
                placeholder="Chapter room"
              />
            </label>
            <label>
              <span className="mb-1 block font-semibold">
                Instructions (optional)
              </span>
              <textarea
                name="instructions"
                maxLength={1000}
                rows={2}
                className="w-full rounded-xl border p-3"
              />
            </label>
            <fieldset className="md:col-span-2">
              <legend className="mb-2 font-semibold">Assigned proctors</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.proctors.map((proctor) => (
                  <label
                    key={proctor.id}
                    className="flex items-center gap-2 rounded-lg border p-3"
                  >
                    <input
                      type="checkbox"
                      name="proctorMemberIds"
                      value={proctor.id}
                    />
                    {proctor.fullName}
                  </label>
                ))}
              </div>
              {!data.proctors.length && (
                <p className="text-sm text-[var(--muted)]">
                  No active linked Proctors are available.
                </p>
              )}
            </fieldset>
            <Button type="submit" className="md:col-span-2">
              Create recurring session
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--navy)]">
          Active recurring sessions
        </h2>
        {data.series.map((series) => (
          <Card key={series.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--navy)]">
                    {weekdays[series.dayOfWeek]} ·{" "}
                    {series.startTime.slice(0, 5)}–{series.endTime.slice(0, 5)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {series.location}
                    {series.instructions ? ` · ${series.instructions}` : ""}
                  </p>
                </div>
                <Badge tone="success">Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <details>
                <summary
                  aria-label={`Edit recurring session on ${weekdays[series.dayOfWeek]} from ${series.startTime.slice(0, 5)} to ${series.endTime.slice(0, 5)}`}
                  className="cursor-pointer font-semibold text-[var(--navy)]"
                >
                  Edit recurring session
                </summary>
                <form
                  action={updateScheduleSeries}
                  className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-2"
                >
                  <input type="hidden" name="seriesId" value={series.id} />
                  <input
                    type="hidden"
                    name="semesterId"
                    value={series.semesterId}
                  />
                  <label>
                    <span className="mb-1 block font-semibold">Weekday</span>
                    <select
                      name="dayOfWeek"
                      defaultValue={String(series.dayOfWeek)}
                      className="min-h-11 w-full rounded-xl border bg-white px-3"
                    >
                      {weekdays.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <span className="mb-1 block font-semibold">Start</span>
                      <input
                        name="startTime"
                        type="time"
                        required
                        defaultValue={series.startTime.slice(0, 5)}
                        className="min-h-11 w-full rounded-xl border px-3"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block font-semibold">End</span>
                      <input
                        name="endTime"
                        type="time"
                        required
                        defaultValue={series.endTime.slice(0, 5)}
                        className="min-h-11 w-full rounded-xl border px-3"
                      />
                    </label>
                  </div>
                  <label>
                    <span className="mb-1 block font-semibold">Location</span>
                    <input
                      name="location"
                      required
                      maxLength={200}
                      defaultValue={series.location}
                      className="min-h-11 w-full rounded-xl border px-3"
                    />
                  </label>
                  <label>
                    <span className="mb-1 block font-semibold">
                      Instructions
                    </span>
                    <textarea
                      name="instructions"
                      maxLength={1000}
                      defaultValue={series.instructions ?? ""}
                      rows={2}
                      className="w-full rounded-xl border p-3"
                    />
                  </label>
                  <fieldset className="md:col-span-2">
                    <legend className="mb-2 font-semibold">
                      Assigned proctors
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {data.proctors.map((proctor) => (
                        <label
                          key={proctor.id}
                          className="flex items-center gap-2 rounded-lg border p-3"
                        >
                          <input
                            type="checkbox"
                            name="proctorMemberIds"
                            value={proctor.id}
                            defaultChecked={series.proctorMemberIds.includes(
                              proctor.id,
                            )}
                          />
                          {proctor.fullName}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Button type="submit" className="md:col-span-2">
                    Save recurring changes
                  </Button>
                </form>
              </details>
              <details className="mt-4 border-t pt-4">
                <summary
                  aria-label={`Remove recurring session on ${weekdays[series.dayOfWeek]} from ${series.startTime.slice(0, 5)} to ${series.endTime.slice(0, 5)}`}
                  className="cursor-pointer font-semibold text-[var(--danger)]"
                >
                  Remove recurring session
                </summary>
                <form
                  action={removeScheduleSeries}
                  className="mt-3 flex flex-col gap-3 sm:flex-row"
                >
                  <input type="hidden" name="seriesId" value={series.id} />
                  <input
                    name="reason"
                    required
                    maxLength={500}
                    placeholder="Reason for removal"
                    className="min-h-11 flex-1 rounded-xl border px-3"
                  />
                  <Button
                    type="submit"
                    className="bg-[var(--danger)] hover:bg-[var(--danger)]"
                  >
                    Remove future occurrences
                  </Button>
                </form>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Past sessions remain in history. Future dates become explicit
                  cancellations.
                </p>
              </details>
            </CardContent>
          </Card>
        ))}
        {!data.series.length && (
          <Card>
            <CardContent>
              <p className="text-[var(--muted)]">
                No recurring sessions have been configured for this semester.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
