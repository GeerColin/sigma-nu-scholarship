import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  saveEmailTemplate,
  updateChapterConfiguration,
} from "@/features/settings/actions";
import { emailTemplateDefaults } from "@/lib/email/defaults";
import { requireChairContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

const templateTypes = [
  "missing_grade_reminder",
  "study_hour_assignment",
  "academic_alert",
] as const;

export async function ChapterConfiguration() {
  const context = await requireChairContext();
  const supabase = await createClient();
  const [
    { data: settings, error: settingsError },
    { data: templates, error: templateError },
  ] = await Promise.all([
    supabase
      .from("chapter_settings")
      .select(
        "percentage_alert_drop, letter_alert_steps, email_from, email_reply_to",
      )
      .eq("chapter_id", context.chapterId!)
      .maybeSingle(),
    supabase
      .from("email_templates")
      .select(
        "template_type, name, subject_template, body_template, version, active",
      )
      .eq("chapter_id", context.chapterId!)
      .eq("active", true),
  ]);
  if (settingsError || templateError) {
    throw new Error("Could not load chapter configuration.");
  }

  return (
    <div className="mb-6 space-y-5">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-[var(--navy)]">
            Academic alert rules
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Set when grade changes should create a contextual member alert.
            Every change is audited.
          </p>
        </CardHeader>
        <CardContent>
          <form
            action={updateChapterConfiguration}
            className="grid gap-4 lg:grid-cols-2"
          >
            <label>
              <span className="mb-1.5 block font-semibold">
                Percentage-drop alert
              </span>
              <input
                name="percentageAlertDrop"
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                defaultValue={settings?.percentage_alert_drop ?? 10}
                className="min-h-11 w-full rounded-xl border px-3"
              />
            </label>
            <label>
              <span className="mb-1.5 block font-semibold">
                Letter-grade alert steps
              </span>
              <input
                name="letterAlertSteps"
                type="number"
                min="1"
                max="12"
                required
                defaultValue={settings?.letter_alert_steps ?? 1}
                className="min-h-11 w-full rounded-xl border px-3"
              />
            </label>
            <details className="rounded-xl border lg:col-span-2">
              <summary className="min-h-11 cursor-pointer px-4 py-3 font-semibold text-[var(--navy)]">
                Optional external email identity
              </summary>
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block font-semibold">
                    Email sender identity
                  </span>
                  <input
                    name="emailFrom"
                    maxLength={320}
                    defaultValue={settings?.email_from ?? ""}
                    placeholder="Scholarship Chair <chair@example.org>"
                    className="min-h-11 w-full rounded-xl border px-3"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block font-semibold">
                    Reply-to email
                  </span>
                  <input
                    name="emailReplyTo"
                    type="email"
                    maxLength={320}
                    defaultValue={settings?.email_reply_to ?? ""}
                    className="min-h-11 w-full rounded-xl border px-3"
                  />
                </label>
                <p className="text-sm text-[var(--muted)] sm:col-span-2">
                  Optional. The core scholarship workflow works without an
                  external email provider.
                </p>
              </div>
            </details>
            <Button type="submit" className="w-fit">
              Save chapter configuration
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <details>
          <summary className="min-h-12 cursor-pointer list-none px-5 py-4">
            <h2 className="text-xl font-bold text-[var(--navy)]">
              Optional email templates
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Configure templates only if the chapter later enables external
              email delivery.
            </p>
          </summary>
          <div className="divide-y border-t">
            {templateTypes.map((templateType) => {
              const saved = (templates ?? []).find(
                (template) => template.template_type === templateType,
              );
              const fallback = emailTemplateDefaults[templateType]!;
              return (
                <form
                  key={templateType}
                  action={saveEmailTemplate}
                  className="space-y-3 p-5"
                >
                  <input
                    type="hidden"
                    name="templateType"
                    value={templateType}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-[var(--navy)]">
                      {fallback.name}
                    </p>
                    <Badge tone={saved ? "success" : "neutral"}>
                      {saved ? `Version ${saved.version}` : "Built-in default"}
                    </Badge>
                  </div>
                  <input
                    name="name"
                    aria-label={`${fallback.name} template name`}
                    required
                    maxLength={120}
                    defaultValue={saved?.name ?? fallback.name}
                    className="min-h-11 w-full rounded-xl border px-3"
                  />
                  <input
                    name="subject"
                    aria-label={`${fallback.name} subject`}
                    required
                    maxLength={200}
                    defaultValue={saved?.subject_template ?? fallback.subject}
                    className="min-h-11 w-full rounded-xl border px-3"
                  />
                  <textarea
                    name="body"
                    aria-label={`${fallback.name} body`}
                    required
                    maxLength={20000}
                    rows={5}
                    defaultValue={saved?.body_template ?? fallback.body}
                    className="w-full rounded-xl border p-3"
                  />
                  <Button type="submit">Save new template version</Button>
                </form>
              );
            })}
          </div>
        </details>
      </Card>
    </div>
  );
}
