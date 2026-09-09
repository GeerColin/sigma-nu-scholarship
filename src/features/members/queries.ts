import "server-only";

import { getActiveAcademicPeriod } from "@/lib/academic/calendar";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type MemberDirectoryFilters = {
  q?: string;
  filter?: string;
  gpaMin?: number;
  gpaMax?: number;
};

export type MemberDirectoryItem = {
  id: string;
  name: string;
  status: "active" | "inactive" | "alumni";
  connected: boolean;
  notificationEmail: string | null;
  roles: string[];
  estimatedGpa: number | null;
  submissionStatus: "on_time" | "late" | "missing" | "not_configured";
  submittedAt: string | null;
  revisionTiming: "on_time" | "late" | null;
  revisionNumber: number | null;
  requiredMinutes: number | null;
  completedMinutes: number;
  hasAcademicAlert: boolean;
  overridden: boolean;
  assignmentId: string | null;
  automaticHours: number | null;
  assignmentState: string | null;
  overrideReason: string | null;
  proposedHours: number | null;
};

export async function getMemberDirectory(filters: MemberDirectoryFilters) {
  const context = await requireChairContext();
  const supabase = await createClient();
  const period = await getActiveAcademicPeriod(context.chapterId!);

  const { data: memberRows, error: memberError } = await supabase
    .from("members")
    .select(
      "id, full_name, status, profile_id, notification_email, member_roles(role, active)",
    )
    .eq("chapter_id", context.chapterId!)
    .order("full_name");
  if (memberError) throw new Error("Could not load members.");

  const memberIds = (memberRows ?? []).map((member) => member.id);
  const weekId = period?.currentWeek?.id;
  const [submissionsResult, assignmentsResult, sessionsResult, alertsResult] =
    await Promise.all([
      weekId
        ? supabase
            .from("grade_submissions")
            .select(
              "member_id, estimated_gpa_snapshot, original_timing, revision_timing, revision_number, original_submitted_at",
            )
            .eq("week_id", weekId)
            .eq("is_current", true)
        : Promise.resolve({ data: [], error: null }),
      weekId
        ? supabase
            .from("study_hour_assignments")
            .select(
              "id, member_id, automatic_hours, final_hours, override_hours, override_reason, state, proposed_hours",
            )
            .eq("week_id", weekId)
        : Promise.resolve({ data: [], error: null }),
      weekId
        ? supabase
            .from("study_sessions")
            .select("member_id, duration_minutes")
            .eq("week_id", weekId)
            .is("voided_at", null)
        : Promise.resolve({ data: [], error: null }),
      memberIds.length
        ? supabase
            .from("academic_alerts")
            .select("member_id")
            .in("member_id", memberIds)
            .is("acknowledged_at", null)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (
    submissionsResult.error ||
    assignmentsResult.error ||
    sessionsResult.error ||
    alertsResult.error
  ) {
    throw new Error("Could not load member academic status.");
  }

  const submissions = new Map(
    (submissionsResult.data ?? []).map((submission) => [
      submission.member_id,
      submission,
    ]),
  );
  const assignments = new Map(
    (assignmentsResult.data ?? []).map((assignment) => [
      assignment.member_id,
      assignment,
    ]),
  );
  const completed = new Map<string, number>();
  for (const session of sessionsResult.data ?? []) {
    completed.set(
      session.member_id,
      (completed.get(session.member_id) ?? 0) + session.duration_minutes,
    );
  }
  const alerted = new Set(
    (alertsResult.data ?? []).map((alert) => alert.member_id),
  );

  const items: MemberDirectoryItem[] = (memberRows ?? []).map((member) => {
    const submission = submissions.get(member.id);
    const assignment = assignments.get(member.id);
    return {
      id: member.id,
      name: member.full_name,
      status: member.status,
      connected: Boolean(member.profile_id),
      notificationEmail: member.notification_email,
      roles: (member.member_roles as Array<{ role: string; active: boolean }>)
        .filter((role) => role.active)
        .map((role) => role.role),
      estimatedGpa:
        submission?.estimated_gpa_snapshot === null ||
        submission?.estimated_gpa_snapshot === undefined
          ? null
          : Number(submission.estimated_gpa_snapshot),
      submissionStatus: !weekId
        ? "not_configured"
        : submission?.original_timing === "on_time"
          ? "on_time"
          : submission?.original_timing === "late"
            ? "late"
            : "missing",
      submittedAt: submission?.original_submitted_at ?? null,
      revisionTiming: submission?.revision_timing ?? null,
      revisionNumber: submission?.revision_number ?? null,
      requiredMinutes:
        assignment?.final_hours === null ||
        assignment?.final_hours === undefined
          ? null
          : Number(assignment.final_hours) * 60,
      completedMinutes: completed.get(member.id) ?? 0,
      hasAcademicAlert: alerted.has(member.id),
      overridden:
        assignment?.override_hours !== null && assignment !== undefined,
      assignmentId: assignment?.id ?? null,
      automaticHours:
        assignment?.automatic_hours === undefined
          ? null
          : Number(assignment.automatic_hours),
      assignmentState: assignment?.state ?? null,
      overrideReason: assignment?.override_reason ?? null,
      proposedHours:
        assignment?.proposed_hours === null ||
        assignment?.proposed_hours === undefined
          ? null
          : Number(assignment.proposed_hours),
    };
  });

  const query = filters.q?.trim().toLocaleLowerCase() ?? "";
  const filtered = items.filter((member) => {
    if (query && !member.name.toLocaleLowerCase().includes(query)) return false;
    if (filters.gpaMin !== undefined) {
      if (member.estimatedGpa === null || member.estimatedGpa < filters.gpaMin)
        return false;
    }
    if (filters.gpaMax !== undefined) {
      if (member.estimatedGpa === null || member.estimatedGpa > filters.gpaMax)
        return false;
    }
    switch (filters.filter) {
      case "active":
      case "inactive":
      case "alumni":
        return member.status === filters.filter;
      case "missing":
        return member.submissionStatus === "missing";
      case "incomplete":
        return (
          member.requiredMinutes !== null &&
          member.completedMinutes < member.requiredMinutes
        );
      case "alerts":
        return member.hasAcademicAlert;
      default:
        return true;
    }
  });

  return { members: filtered, period };
}

export type MemberDetail = {
  id: string;
  name: string;
  status: "active" | "inactive" | "alumni";
  connectedEmail: string | null;
  notificationEmail: string | null;
  connectedName: string | null;
  roles: string[];
  courses: Array<{
    id: string;
    name: string;
    creditHours: number;
    gradingType: string;
    archived: boolean;
    latestValue: unknown;
    customDescription: string | null;
    customReview: {
      treatment: "exclude" | "pass_fail" | "custom_conversion";
      reason: string;
      reviewedAt: string;
    } | null;
  }>;
  submissions: Array<{
    id: string;
    weekLabel: string;
    revision: number;
    submittedAt: string;
    originalSubmittedAt: string;
    timing: "on_time" | "late";
    revisionTiming: "on_time" | "late";
    isCurrent: boolean;
    estimatedGpa: number | null;
    includedCourseCount: number;
    activeCourseCount: number;
    entries: Array<{
      courseId: string;
      courseName: string;
      reportedValue: unknown;
    }>;
  }>;
  studyHours: {
    assignmentId: string;
    requiredMinutes: number;
    completedMinutes: number;
    remainingMinutes: number;
    overridden: boolean;
    overrideReason: string | null;
    state: string;
  } | null;
  studySessions: Array<{
    id: string;
    date: string;
    durationMinutes: number;
    notes: string | null;
    proctorName: string;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    details: unknown;
    createdAt: string;
    acknowledgedAt: string | null;
  }>;
};

export async function getMemberDetail(memberId: string) {
  const context = await requireChairContext();
  const supabase = await createClient();
  const period = await getActiveAcademicPeriod(context.chapterId!);

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select(
      "id, full_name, status, profile_id, notification_email, profiles(email, display_name), member_roles(role, active)",
    )
    .eq("id", memberId)
    .eq("chapter_id", context.chapterId!)
    .maybeSingle();
  if (memberError) throw new Error("Could not load the member profile.");
  if (!member) return null;

  const semesterId = period?.semester.id;
  const weekId = period?.currentWeek?.id;
  const [
    coursesResult,
    submissionsResult,
    assignmentResult,
    sessionsResult,
    alertsResult,
    customReviewsResult,
  ] = await Promise.all([
    semesterId
      ? supabase
          .from("courses")
          .select(
            "id, name, credit_hours, grading_type, custom_grading_description, archived_at, created_at",
          )
          .eq("member_id", memberId)
          .eq("semester_id", semesterId)
          .order("created_at")
      : Promise.resolve({ data: [], error: null }),
    semesterId
      ? supabase
          .from("grade_submissions")
          .select(
            "id, week_id, revision_number, submitted_at, original_submitted_at, original_timing, revision_timing, is_current, estimated_gpa_snapshot, included_course_count, active_course_count, academic_weeks(label, sequence_number), grade_entries(course_id, course_name_snapshot, reported_value)",
          )
          .eq("member_id", memberId)
          .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    weekId
      ? supabase
          .from("study_hour_assignments")
          .select("id, final_hours, override_hours, override_reason, state")
          .eq("member_id", memberId)
          .eq("week_id", weekId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    weekId
      ? supabase
          .from("study_sessions")
          .select(
            "id, session_date, duration_minutes, notes, members!study_sessions_proctor_member_id_fkey(full_name)",
          )
          .eq("member_id", memberId)
          .eq("week_id", weekId)
          .is("voided_at", null)
          .order("session_date", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("academic_alerts")
      .select("id, alert_type, details, created_at, acknowledged_at")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false }),
    supabase
      .from("custom_grading_reviews")
      .select("course_id, treatment, reason, created_at")
      .eq("chapter_id", context.chapterId!)
      .order("created_at", { ascending: false }),
  ]);

  if (
    coursesResult.error ||
    submissionsResult.error ||
    assignmentResult.error ||
    sessionsResult.error ||
    alertsResult.error ||
    customReviewsResult.error
  ) {
    throw new Error("Could not load the member’s academic details.");
  }

  const submissions: MemberDetail["submissions"] = (
    submissionsResult.data ?? []
  ).map((submission) => {
    const week = submission.academic_weeks as unknown as {
      label: string;
      sequence_number: number;
    } | null;
    return {
      id: submission.id,
      weekLabel: week?.label ?? "Academic week",
      revision: submission.revision_number,
      submittedAt: submission.submitted_at,
      originalSubmittedAt: submission.original_submitted_at,
      timing: submission.original_timing,
      revisionTiming: submission.revision_timing,
      isCurrent: submission.is_current,
      estimatedGpa:
        submission.estimated_gpa_snapshot === null
          ? null
          : Number(submission.estimated_gpa_snapshot),
      includedCourseCount: submission.included_course_count,
      activeCourseCount: submission.active_course_count,
      entries: (
        submission.grade_entries as Array<{
          course_id: string;
          course_name_snapshot: string;
          reported_value: unknown;
        }>
      ).map((entry) => ({
        courseId: entry.course_id,
        courseName: entry.course_name_snapshot,
        reportedValue: entry.reported_value,
      })),
    };
  });

  const latestEntries = new Map(
    (submissions.find((submission) => submission.isCurrent)?.entries ?? []).map(
      (entry) => [entry.courseId, entry.reportedValue],
    ),
  );
  const customReviews = new Map<
    string,
    {
      treatment: "exclude" | "pass_fail" | "custom_conversion";
      reason: string;
      reviewedAt: string;
    }
  >();
  for (const review of customReviewsResult.data ?? []) {
    if (!customReviews.has(review.course_id)) {
      customReviews.set(review.course_id, {
        treatment: review.treatment,
        reason: review.reason,
        reviewedAt: review.created_at,
      });
    }
  }
  const completedMinutes = (sessionsResult.data ?? []).reduce(
    (total, session) => total + session.duration_minutes,
    0,
  );
  const assignment = assignmentResult.data;
  const profile = member.profiles as unknown as {
    email: string;
    display_name: string | null;
  } | null;

  const detail: MemberDetail = {
    id: member.id,
    name: member.full_name,
    status: member.status,
    connectedEmail: profile?.email ?? null,
    notificationEmail: member.notification_email,
    connectedName: profile?.display_name ?? null,
    roles: (member.member_roles as Array<{ role: string; active: boolean }>)
      .filter((role) => role.active)
      .map((role) => role.role),
    courses: (coursesResult.data ?? []).map((course) => ({
      id: course.id,
      name: course.name,
      creditHours: Number(course.credit_hours),
      gradingType: course.grading_type,
      archived: Boolean(course.archived_at),
      latestValue: latestEntries.get(course.id) ?? null,
      customDescription: course.custom_grading_description,
      customReview: customReviews.get(course.id) ?? null,
    })),
    submissions,
    studyHours: assignment
      ? {
          assignmentId: assignment.id,
          requiredMinutes: Number(assignment.final_hours) * 60,
          completedMinutes,
          remainingMinutes: Math.max(
            Number(assignment.final_hours) * 60 - completedMinutes,
            0,
          ),
          overridden: assignment.override_hours !== null,
          overrideReason: assignment.override_reason,
          state: assignment.state,
        }
      : null,
    studySessions: (sessionsResult.data ?? []).map((session) => ({
      id: session.id,
      date: session.session_date,
      durationMinutes: session.duration_minutes,
      notes: session.notes,
      proctorName:
        (session.members as unknown as { full_name: string } | null)
          ?.full_name ?? "Unknown proctor",
    })),
    alerts: (alertsResult.data ?? []).map((alert) => ({
      id: alert.id,
      type: alert.alert_type,
      details: alert.details,
      createdAt: alert.created_at,
      acknowledgedAt: alert.acknowledged_at,
    })),
  };

  return { member: detail, period };
}
