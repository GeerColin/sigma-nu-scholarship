import type { ScheduleEntry } from "@/features/schedule/queries";

export function scheduleHighlights(
  entries: ScheduleEntry[],
  memberId?: string,
  now = new Date(),
) {
  const available = entries.filter(
    (entry) =>
      !entry.cancelled &&
      (!memberId ||
        entry.proctors.some((proctor) => proctor.memberId === memberId)),
  );
  const happening = available.filter((entry) => {
    const start = new Date(entry.startsAt).getTime();
    const end = new Date(entry.endsAt).getTime();
    return start <= now.getTime() && now.getTime() < end;
  });
  if (happening.length)
    return { state: "happening" as const, entries: happening };
  const upcoming = available
    .filter((entry) => new Date(entry.endsAt).getTime() > now.getTime())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (!upcoming.length) return { state: "empty" as const, entries: [] };
  const firstStart = upcoming[0]?.startsAt;
  if (!firstStart) return { state: "empty" as const, entries: [] };
  return {
    state: "upcoming" as const,
    entries: upcoming.filter((entry) => entry.startsAt === firstStart),
  };
}
