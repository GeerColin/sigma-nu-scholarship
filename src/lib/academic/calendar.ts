import "server-only";

import { cache } from "react";
import { dateInTimeZone } from "@/lib/domain/dates";
import { createClient } from "@/lib/supabase/server";

export type ActiveAcademicPeriod = {
  semester: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    timezone: string;
    deadlineWeekday: number;
    deadlineTime: string;
  };
  currentWeek: {
    id: string;
    sequenceNumber: number;
    label: string;
    startsOn: string;
    endsOn: string;
    deadlineAt: string;
  } | null;
};

export const getActiveAcademicPeriod = cache(
  async (chapterId: string): Promise<ActiveAcademicPeriod | null> => {
    const supabase = await createClient();
    const { data: semester, error } = await supabase
      .from("semesters")
      .select(
        "id, name, start_date, end_date, timezone, default_deadline_weekday, default_deadline_time",
      )
      .eq("chapter_id", chapterId)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error("Could not load the active semester.");
    if (!semester) return null;

    const today = dateInTimeZone(new Date(), semester.timezone);
    const { data: week, error: weekError } = await supabase
      .from("academic_weeks")
      .select("id, sequence_number, label, starts_on, ends_on, deadline_at")
      .eq("semester_id", semester.id)
      .lte("starts_on", today)
      .gte("ends_on", today)
      .maybeSingle();
    if (weekError) throw new Error("Could not load the current academic week.");

    return {
      semester: {
        id: semester.id,
        name: semester.name,
        startDate: semester.start_date,
        endDate: semester.end_date,
        timezone: semester.timezone,
        deadlineWeekday: semester.default_deadline_weekday,
        deadlineTime: semester.default_deadline_time,
      },
      currentWeek: week
        ? {
            id: week.id,
            sequenceNumber: week.sequence_number,
            label: week.label,
            startsOn: week.starts_on,
            endsOn: week.ends_on,
            deadlineAt: week.deadline_at,
          }
        : null,
    };
  },
);
