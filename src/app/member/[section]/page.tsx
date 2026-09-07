import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent } from "@/components/ui/card";
const sections = {
  "check-in": [
    "Weekly Check-In",
    "Your active courses will be prefilled from the previous week. Submitting creates a new immutable revision.",
  ],
  courses: [
    "My Courses",
    "Add, update, or archive courses for the active semester. Archived courses remain in history.",
  ],
  "study-hours": [
    "My Study Hours",
    "Review your final required amount and proctor-recorded completed minutes.",
  ],
  history: [
    "My History / Trends",
    "Review only your own weekly submissions, revisions, and estimated-semester trend.",
  ],
} as const;
export default async function MemberSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const content = sections[section as keyof typeof sections];
  if (!content) notFound();
  return (
    <main className="mx-auto min-h-screen max-w-4xl p-4 sm:p-7">
      <header className="mb-8 flex items-center justify-between">
        <BrandMark />
        <Link
          href="/member"
          className="font-semibold text-[var(--navy)] hover:underline"
        >
          Home
        </Link>
      </header>
      <h1 className="text-4xl font-bold text-[var(--navy)]">{content[0]}</h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">{content[1]}</p>
      <Card className="mt-7">
        <CardContent>
          <p className="font-semibold text-[var(--navy)]">
            Connect the development database to use this workflow
          </p>
          <p className="mt-2 text-[var(--muted)]">
            The production path requires an approved Google-linked member and
            applies Row Level Security before loading or changing academic
            records.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
