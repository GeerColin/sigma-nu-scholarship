import Link from "next/link";
import { redirect } from "next/navigation";
import { ChairAppShell } from "@/components/chair-app-shell";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { bootstrapChapter } from "@/features/setup/actions";
import { getCurrentUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const query = await searchParams;
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  if (!context.memberId) {
    return (
      <main className="grid min-h-screen place-items-center p-5">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-7 sm:p-9">
            <p className="text-sm font-bold tracking-[0.14em] text-[var(--warning)] uppercase">
              One-time initialization
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--navy)]">
              Create the chapter workspace
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              Use the single-use bootstrap token supplied through the secure
              deployment process. It is verified as a hash in Supabase and is
              consumed when setup succeeds.
            </p>
            {query.error && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-[var(--danger-soft)] p-4 font-semibold text-[var(--danger)]"
              >
                Setup was not completed. Check the fields and confirm that the
                token is valid, unused, and unexpired.
              </p>
            )}
            <form action={bootstrapChapter} className="mt-7 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  name="fraternityName"
                  label="Fraternity"
                  defaultValue="Sigma Nu"
                />
                <TextField name="chapterName" label="Chapter name" />
              </div>
              <TextField name="institutionName" label="Institution" />
              <TextField
                name="chairName"
                label="Initial Scholarship Chair name"
              />
              <TextField
                name="bootstrapToken"
                label="One-time bootstrap token"
                type="password"
                autoComplete="off"
              />
              <label className="flex items-start gap-3 rounded-xl bg-[var(--surface-subtle)] p-4">
                <input
                  type="checkbox"
                  name="confirmed"
                  value="yes"
                  required
                  className="mt-1 size-4"
                />
                <span className="text-sm">
                  I confirm this Google account should become the first
                  Scholarship Chair for this new chapter workspace.
                </span>
              </label>
              <Button type="submit" className="w-full">
                Create chapter securely
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!context.roles.includes("scholarship_chair")) redirect("/");
  const supabase = await createClient();
  const [
    { data: chapter },
    { count: semesterCount },
    { count: weekCount },
    { count: rosterCount },
    { count: ruleCount },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("chapters")
      .select("chapter_name, institution_name")
      .eq("id", context.chapterId!)
      .single(),
    supabase
      .from("semesters")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", context.chapterId!),
    supabase
      .from("academic_weeks")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", context.chapterId!),
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", context.chapterId!),
    supabase
      .from("study_hour_rule_sets")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", context.chapterId!),
    supabase
      .from("chapter_settings")
      .select("email_from, email_reply_to")
      .eq("chapter_id", context.chapterId!)
      .maybeSingle(),
  ]);
  const steps = [
    { label: "Chapter identity", complete: Boolean(chapter), href: "/setup" },
    { label: "Semester", complete: Boolean(semesterCount), href: "/settings" },
    {
      label: "Academic weeks",
      complete: Boolean(weekCount),
      href: "/settings",
    },
    {
      label: "Study-hour rules",
      complete: Boolean(ruleCount),
      href: "/study-hours",
    },
    {
      label: "Roster",
      complete: (rosterCount ?? 0) > 1,
      href: "/administration/import",
    },
    {
      label: "Email identity",
      complete: Boolean(settings?.email_from),
      href: "/settings",
    },
  ];

  return (
    <ChairAppShell>
      <PageHeading
        eyebrow="Guided configuration"
        title="First-time setup"
        description={`${chapter?.chapter_name ?? "Chapter"} · ${chapter?.institution_name ?? "Institution"}`}
      />
      {query.status === "chapter-created" && (
        <p className="mb-5 rounded-xl bg-[var(--success-soft)] p-4 font-semibold text-[var(--success)]">
          The chapter was created and this account is now Scholarship Chair.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step, index) => (
          <Link key={step.label} href={step.href as never}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--muted)]">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 font-bold text-[var(--navy)]">
                    {step.label}
                  </p>
                </div>
                <Badge tone={step.complete ? "success" : "warning"}>
                  {step.complete ? "Complete" : "Needs setup"}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </ChairAppShell>
  );
}

function TextField({
  label,
  name,
  type = "text",
  defaultValue,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-semibold">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required
        maxLength={type === "password" ? 256 : 160}
        className="min-h-11 w-full rounded-xl border px-3"
      />
    </label>
  );
}
