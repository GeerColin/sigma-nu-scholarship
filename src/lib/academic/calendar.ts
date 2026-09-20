import "server-only";

import { cache } from "react";
import { dateInTimeZone } from "@/lib/domain/dates";
import { createClient } from "@/lib/supabase/server";
import { createReadFailure } from "@/lib/supabase/read-failure";

export type ActiveAcademicPeriod = {
  semester: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    timezone: string;
    deadlineWeekday: number;
    deadlineTime: string;
    firstGradeCheckWeekId: string | null;
    firstGradeCheckSequence: number | null;
  };
  currentWeek: {
    id: string;
    sequenceNumber: number;
    label: string;
    startsOn: string;
    endsOn: string;
    deadlineAt: string;
    gradeCheckConfigured: boolean;
    gradeCheckRequired: boolean;
  } | null;
};

export const getActiveAcademicPeriod = cache(
  async (chapterId: string): Promise<ActiveAcademicPeriod | null> => {
    const supabase = await createClient();
    const {
      data: semester,
      error,
      status,
    } = await supabase
      .from("semesters")
      .select(
        "id, name, start_date, end_date, timezone, default_deadline_weekday, default_deadline_time, first_grade_check_week_id",
      )
      .eq("chapter_id", chapterId)
      .eq("active", true)
      .maybeSingle();
    if (error)
      throw createReadFailure("Could not load the active semester.", [
        { operation: "semester", error, status },
      ]);
    if (!semester) return null;

    const today = dateInTimeZone(new Date(), semester.timezone);
    const [weekResult, firstWeekResult] = await Promise.all([
      supabase
        .from("academic_weeks")
        .select(
          "id, sequence_number, label, starts_on, ends_on, deadline_at, grade_check_required",
        )
        .eq("semester_id", semester.id)
        .lte("starts_on", today)
        .gte("ends_on", today)
        .maybeSingle(),
      semester.first_grade_check_week_id
        ? supabase
            .from("academic_weeks")
            .select("id, sequence_number")
            .eq("id", semester.first_grade_check_week_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null, status: 200 }),
    ]);
    if (weekResult.error)
      throw createReadFailure("Could not load the current academic week.", [
        {
          operation: "week",
          error: weekResult.error,
          status: weekResult.status,
        },
      ]);
    if (firstWeekResult.error)
      throw createReadFailure("Could not load the grade-check schedule.", [
        {
          operation: "week",
          error: firstWeekResult.error,
          status: firstWeekResult.status,
        },
      ]);

    const firstGradeCheckSequence =
      firstWeekResult.data?.sequence_number ?? null;
    const gradeCheckConfigured = Boolean(weekResult.data?.grade_check_required);
    const gradeCheckRequired = Boolean(
      weekResult.data &&
      firstGradeCheckSequence !== null &&
      weekResult.data.sequence_number >= firstGradeCheckSequence &&
      gradeCheckConfigured,
    );

    return {
      semester: {
        id: semester.id,
        name: semester.name,
        startDate: semester.start_date,
        endDate: semester.end_date,
        timezone: semester.timezone,
        deadlineWeekday: semester.default_deadline_weekday,
        deadlineTime: semester.default_deadline_time,
        firstGradeCheckWeekId: semester.first_grade_check_week_id,
        firstGradeCheckSequence,
      },
      currentWeek: weekResult.data
        ? {
            id: weekResult.data.id,
            sequenceNumber: weekResult.data.sequence_number,
            label: weekResult.data.label,
            startsOn: weekResult.data.starts_on,
            endsOn: weekResult.data.ends_on,
            deadlineAt: weekResult.data.deadline_at,
            gradeCheckConfigured,
            gradeCheckRequired,
          }
        : null,
    };
  },
);
