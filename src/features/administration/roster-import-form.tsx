"use client";

import { useActionState, useMemo, useState } from "react";
import {
  importRosterMembers,
  type RosterImportActionState,
} from "@/features/administration/actions";
import {
  confirmedRosterRows,
  prepareRosterImport,
  type RosterImportPreview,
} from "@/features/administration/roster-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function RosterImportForm({
  existingMemberNames,
}: {
  existingMemberNames: string[];
}) {
  const initialState: RosterImportActionState = { status: "idle", message: "" };
  const [preview, setPreview] = useState<RosterImportPreview | null>(null);
  const [fileError, setFileError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [state, formAction, pending] = useActionState(
    importRosterMembers,
    initialState,
  );
  const readyRows = useMemo(
    () => (preview ? confirmedRosterRows(preview) : []),
    [preview],
  );
  const invalidCount =
    preview?.rows.filter((row) => row.issues.length > 0).length ?? 0;

  async function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    setConfirmed(false);
    setFileError("");
    const file = event.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    if (file.size > 2_000_000) {
      setPreview(null);
      setFileError("Choose a CSV file smaller than 2 MB.");
      return;
    }
    try {
      setPreview(prepareRosterImport(await file.text(), existingMemberNames));
    } catch {
      setPreview(null);
      setFileError("The selected file could not be read.");
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <h2 className="font-bold text-[var(--navy)]">Choose roster CSV</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Required headers: First Name, Last Name. Status is optional and
            defaults to Active. No email addresses are imported.
          </p>
        </CardHeader>
        <CardContent>
          <label className="block font-semibold" htmlFor="roster-file">
            CSV file
          </label>
          <input
            id="roster-file"
            type="file"
            accept=".csv,text/csv"
            onChange={selectFile}
            className="mt-2 block w-full rounded-xl border p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--navy)] file:px-3 file:py-2 file:font-semibold file:text-white"
          />
          {fileError && (
            <p className="mt-3 text-sm font-semibold text-red-700" role="alert">
              {fileError}
            </p>
          )}
          {preview?.fatalErrors.map((error) => (
            <p
              key={error}
              className="mt-3 text-sm font-semibold text-red-700"
              role="alert"
            >
              {error}
            </p>
          ))}
        </CardContent>
      </Card>

      {preview && preview.fatalErrors.length === 0 && (
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="rows" value={JSON.stringify(readyRows)} />
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[var(--navy)]">
                    Import preview
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {readyRows.length} ready · {invalidCount} excluded
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
                  {preview.rows.length} parsed rows
                </span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs tracking-wide text-[var(--muted)] uppercase">
                  <tr>
                    <th className="px-5 py-3">Row</th>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td className="px-5 py-3 text-[var(--muted)]">
                        {row.rowNumber}
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {row.fullName}
                      </td>
                      <td className="px-5 py-3 capitalize">{row.status}</td>
                      <td
                        className={`px-5 py-3 ${row.issues.length ? "text-red-700" : "text-emerald-700"}`}
                      >
                        {row.issues.length ? row.issues.join(" ") : "Ready"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="confirmed"
                  value="yes"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1 size-4"
                />
                <span>
                  <span className="block font-semibold">
                    Confirm this roster import
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    Only the {readyRows.length} valid rows shown as Ready will
                    be added. Invalid and duplicate rows will be excluded.
                  </span>
                </span>
              </label>
              <Button
                disabled={!confirmed || readyRows.length === 0 || pending}
              >
                {pending ? "Importing…" : `Import ${readyRows.length} members`}
              </Button>
              {state.message && (
                <p
                  role="status"
                  aria-live="polite"
                  className={`text-sm font-semibold ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}
                >
                  {state.message}
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
