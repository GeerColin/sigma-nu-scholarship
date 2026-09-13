export function memberCheckInState({
  submitted,
  deadlineAt,
  now,
}: {
  submitted: boolean;
  deadlineAt: string;
  now: Date;
}) {
  if (submitted) return "complete" as const;
  return now.getTime() > new Date(deadlineAt).getTime()
    ? ("overdue" as const)
    : ("required" as const);
}

export function memberStudyHourState(
  requiredMinutes: number | null,
  completedMinutes: number,
) {
  if (requiredMinutes === null) {
    return {
      status: "not_assigned" as const,
      remainingMinutes: null,
      progressPercent: 0,
    };
  }
  const remainingMinutes = Math.max(requiredMinutes - completedMinutes, 0);
  const progressPercent =
    requiredMinutes === 0
      ? 100
      : Math.min(Math.round((completedMinutes / requiredMinutes) * 100), 100);
  return {
    status:
      remainingMinutes === 0
        ? ("complete" as const)
        : completedMinutes === 0
          ? ("not_started" as const)
          : ("in_progress" as const),
    remainingMinutes,
    progressPercent,
  };
}
