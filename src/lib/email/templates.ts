import { z } from "zod";

export const EMAIL_TEMPLATE_VARIABLES = [
  "memberName",
  "semesterName",
  "weekLabel",
  "requiredHours",
  "completedHours",
  "remainingHours",
  "deadline",
] as const;

export type EmailTemplateContext = Partial<
  Record<(typeof EMAIL_TEMPLATE_VARIABLES)[number], string | number>
>;

export const emailTemplateSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
});

const tokenPattern = /{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g;

export function validateTemplate(template: { subject: string; body: string }) {
  const parsed = emailTemplateSchema.parse(template);
  const tokens = [
    ...`${parsed.subject}\n${parsed.body}`.matchAll(tokenPattern),
  ].map((match) => match[1]!);
  const unknown = [
    ...new Set(
      tokens.filter(
        (token) =>
          !(EMAIL_TEMPLATE_VARIABLES as readonly string[]).includes(token),
      ),
    ),
  ];
  if (unknown.length)
    throw new Error(
      `Unsupported email template variable: ${unknown.join(", ")}`,
    );
  return parsed;
}

export function renderTemplateText(
  text: string,
  context: EmailTemplateContext,
) {
  return text
    .replace(tokenPattern, (_, token: keyof EmailTemplateContext) => {
      const value = context[token];
      if (value === undefined || value === null)
        throw new Error(`Missing email template value: ${token}`);
      return String(value);
    })
    .replace(/\b1 hours\b/g, "1 hour");
}

export function renderEmailTemplate(
  template: { subject: string; body: string },
  context: EmailTemplateContext,
) {
  const valid = validateTemplate(template);
  return {
    subject: renderTemplateText(valid.subject, context),
    body: renderTemplateText(valid.body, context),
  };
}

export type PreparedEmail = {
  id: string;
  recipientEmail: string;
  recipientName: string;
  selected: boolean;
  finalSubject: string;
  finalBody: string;
};

export function applyBatchEdit(
  messages: readonly PreparedEmail[],
  subject: string,
  body: string,
): PreparedEmail[] {
  const valid = emailTemplateSchema.parse({ subject, body });
  return messages.map((message) => ({
    ...message,
    finalSubject: valid.subject,
    finalBody: valid.body,
  }));
}

export function applyIndividualEdit(
  messages: readonly PreparedEmail[],
  messageId: string,
  subject: string,
  body: string,
): PreparedEmail[] {
  const valid = emailTemplateSchema.parse({ subject, body });
  if (!messages.some((message) => message.id === messageId))
    throw new Error("Prepared email was not found.");
  return messages.map((message) =>
    message.id === messageId
      ? { ...message, finalSubject: valid.subject, finalBody: valid.body }
      : { ...message },
  );
}
