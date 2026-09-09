export const emailTemplateDefaults: Record<
  string,
  { name: string; subject: string; body: string }
> = {
  missing_grade_reminder: {
    name: "Missing grade reminder",
    subject: "{{semesterName}} {{weekLabel}} grade reminder",
    body: "Hello {{memberName}},\n\nYour weekly scholarship check-in for {{weekLabel}} is missing. Please submit it even if the {{deadline}} deadline has passed. Detailed grades are not included in this reminder.",
  },
  study_hour_assignment: {
    name: "Study-hour assignment",
    subject: "{{weekLabel}} study-hour assignment",
    body: "Hello {{memberName}},\n\nYour {{weekLabel}} study-hour requirement is {{requiredHours}} hours. Completed: {{completedHours}} hours. Remaining: {{remainingHours}} hours.",
  },
  academic_alert: {
    name: "Chair academic alert",
    subject: "Academic alert requires review",
    body: "An academic alert for {{memberName}} in {{weekLabel}} requires review in the secure scholarship dashboard. Detailed grades are intentionally omitted from this email.",
  },
};
