import "server-only";

import {
  getActiveAcademicPeriod,
  type ActiveAcademicPeriod,
} from "@/lib/academic/calendar";
import { requireChairContext } from "@/lib/auth/guards";
import { dateInTimeZone } from "@/lib/domain/dates";
import {
  historicalSubmissionStatus,
  studyHourProgress,
} from "@/lib/domain/weekly-review";
import { readAllPages } from "@/lib/supabase/read-all-pages";
import { createReadFailure } from "@/lib/supabase/read-failure";
import { createClient } from "@/lib/supabase/server";
import { weeklyReviewQuerySchema, type WeeklyReviewQuery } from "./validation";

export type ReviewWeek = NonNullable<ActiveAcademicPeriod["currentWeek"]>;
export type WeeklyReviewMember = ReturnType<typeof studyHourProgress> & {
  id: string;
  name: string;
  submissionStatus: ReturnType<typeof historicalSubmissionStatus>;
  submittedAt: string | null;
  activityAfterWeek: boolean;
};

type WeekRow = {
  id: string;
  sequence_number: number;
  label: string;
  starts_on: string;
  ends_on: string;
  deadline_at: string;
  grade_check_required: boolean;
};

// Independent of the directory's current-week loader: browsing never replaces
// the global current week or invokes an assignment/session mutation.
export async function getWeeklyReview(rawQuery: Record<string, unknown>) {
  const context = await requireChairContext();
  const parsed = weeklyReviewQuerySchema.safeParse(rawQuery);
  const query: WeeklyReviewQuery = parsed.success
    ? parsed.data
    : { status: "all", hours: "all" };
  const period = await getActiveAcademicPeriod(context.chapterId!);
  const base = {
    query,
    period,
    weeks: [] as ReviewWeek[],
    selectedWeek: null as ReviewWeek | null,
    members: [] as WeeklyReviewMember[],
    historical: false,
    problem: null as string | null,
  };
  if (!parsed.success)
    return {
      ...base,
      problem:
        "That week or filter selection is invalid. Choose the current week to start again.",
    };
  if (!period) return { ...base, problem: "No active semester is configured." };
  if (!period.currentWeek)
    return {
      ...base,
      problem:
        "No current academic week is configured. No other week has been substituted.",
    };

  const supabase = await createClient();
  const weeksResult = await readAllPages((from, to) =>
    supabase
      .from("academic_weeks")
      .select(
        "id, sequence_number, label, starts_on, ends_on, deadline_at, grade_check_required",
      )
      .eq("chapter_id", context.chapterId!)
      .eq("semester_id", period.semester.id)
      .lte("sequence_number", period.currentWeek!.sequenceNumber)
      .gte("starts_on", period.semester.startDate)
      .lte("ends_on", period.semester.endDate)
      .order("sequence_number")
      .order("id")
      .range(from, to),
  );
  if (weeksResult.error)
    throw createReadFailure("Could not load academic weeks.", [
      { operation: "week", ...weeksResult },
    ]);
  const weeks: ReviewWeek[] = (weeksResult.data as WeekRow[]).map((week) => ({
    id: week.id,
    sequenceNumber: week.sequence_number,
    label: week.label,
    startsOn: week.starts_on,
    endsOn: week.ends_on,
    deadlineAt: week.deadline_at,
    gradeCheckConfigured: week.grade_check_required,
    gradeCheckRequired:
      period.semester.firstGradeCheckSequence !== null &&
      week.sequence_number >= period.semester.firstGradeCheckSequence &&
      week.grade_check_required,
  }));
  const selectedWeek = weeks.find(
    (week) =>
      week.sequenceNumber ===
      (parsed.data.week ?? period.currentWeek!.sequenceNumber),
  );
  if (!selectedWeek)
    return {
      ...base,
      weeks,
      problem:
        "That week is not available in this chapter’s active semester. Only the current and previous academic weeks can be viewed.",
    };
  const historical = selectedWeek.id !== period.currentWeek.id;
  const chapterId = context.chapterId!;
  const weekId = selectedWeek.id;
  const [membersResult, submissionsResult, assignmentsResult, sessionsResult] =
    await Promise.all([
      readAllPages((from, to) =>
        supabase
          .from("members")
          .select("id, full_name")
          .eq("chapter_id", chapterId)
          .eq("status", "active")
          .order("full_name")
          .order("id")
          .range(from, to),
      ),
      readAllPages((from, to) =>
        supabase
          .from("grade_submissions")
          .select("id, member_id, original_timing, original_submitted_at")
          .eq("chapter_id", chapterId)
          .eq("week_id", weekId)
          .eq("is_current", true)
          .order("id")
          .range(from, to),
      ),
      readAllPages((from, to) =>
        supabase
          .from("study_hour_assignments")
          .select(
            "id, member_id, final_hours, created_at, updated_at, override_at",
          )
          .eq("chapter_id", chapterId)
          .eq("week_id", weekId)
          .order("id")
          .range(from, to),
      ),
      readAllPages((from, to) =>
        supabase
          .from("study_sessions")
          .select(
            "id, member_id, duration_minutes, session_date, voided_at, created_at, updated_at",
          )
          .eq("chapter_id", chapterId)
          .eq("week_id", weekId)
          .gte("session_date", selectedWeek.startsOn)
          .lte("session_date", selectedWeek.endsOn)
          .order("id")
          .range(from, to),
      ),
    ]);
  if (
    membersResult.error ||
    submissionsResult.error ||
    assignmentsResult.error ||
    sessionsResult.error
  ) {
    throw createReadFailure("Could not load weekly academic status.", [
      { operation: "members", ...membersResult },
      { operation: "submissions", ...submissionsResult },
      { operation: "assignments", ...assignmentsResult },
      { operation: "sessions", ...sessionsResult },
    ]);
  }

  const submissions = new Map(
    submissionsResult.data!.map((row) => [row.member_id, row]),
  );
  const assignments = new Map(
    assignmentsResult.data!.map((row) => [row.member_id, row]),
  );
  const sessionsByMember = new Map<
    string,
    NonNullable<typeof sessionsResult.data>
  >();
  for (const session of sessionsResult.data!) {
    const sessions = sessionsByMember.get(session.member_id) ?? [];
    sessions.push(session);
    sessionsByMember.set(session.member_id, sessions);
  }
  const afterWeek = (timestamp: string | null | undefined) =>
    Boolean(
      historical &&
      timestamp &&
      Number.isFinite(new Date(timestamp).getTime()) &&
      dateInTimeZone(new Date(timestamp), period.semester.timezone) >
        selectedWeek.endsOn,
    );
  const members: WeeklyReviewMember[] = membersResult.data!.map((member) => {
    const assignment = assignments.get(member.id);
    const submission = submissions.get(member.id);
    const sessions = sessionsByMember.get(member.id) ?? [];
    return {
      id: member.id,
      name: member.full_name,
      ...studyHourProgress(
        assignment?.final_hours ?? null,
        sessions.map((session) => ({
          durationMinutes: session.duration_minutes,
          voided: Boolean(session.voided_at),
        })),
      ),
      submissionStatus: historicalSubmissionStatus({
        historical,
        required: selectedWeek.gradeCheckRequired,
        submitted: Boolean(submission),
        originalTiming: submission?.original_timing,
        deadlineAt: selectedWeek.deadlineAt,
      }),
      submittedAt: submission?.original_submitted_at ?? null,
      // A timestamp proves record activity, not that academic totals changed.
      activityAfterWeek:
        [
          assignment?.created_at,
          assignment?.updated_at,
          assignment?.override_at,
        ].some(afterWeek) ||
        sessions.some((session) =>
          [session.created_at, session.updated_at, session.voided_at].some(
            afterWeek,
          ),
        ),
    };
  });
  return { ...base, weeks, selectedWeek, historical, members };
}
