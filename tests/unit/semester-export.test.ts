import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  createSemesterExportArchive,
  EXPORT_COLUMNS,
  rowsToCsv,
  safeExportFilename,
  type SemesterExportData,
} from "@/features/administration/semester-export";

function emptyExportData(): SemesterExportData {
  return Object.fromEntries(
    Object.keys(EXPORT_COLUMNS).map((table) => [table, []]),
  ) as unknown as SemesterExportData;
}

describe("semester export", () => {
  it.each(["=1+2", "+1+2", "-1+2", "@SUM(1)", "  =1+2", "\t=1+2", "＝1+2"])(
    "exports formula-like user text as a quoted text cell: %j",
    (value) => {
      expect(rowsToCsv([{ value }], ["value"])).toBe(`value\r\n"'${value}"`);
    },
  );

  it("preserves actual numbers and quotes alternate delimiters", () => {
    expect(rowsToCsv([{ value: -2 }], ["value"])).toBe("value\r\n-2");
    expect(rowsToCsv([{ value: "Synthetic;=1+2" }], ["value"])).toBe(
      'value\r\n"Synthetic;=1+2"',
    );
  });

  it("escapes commas, quotes, newlines, and JSON values in CSV", () => {
    const csv = rowsToCsv(
      [
        {
          name: 'Course, "Advanced"',
          notes: "line one\nline two",
          details: { synthetic: true },
        },
      ],
      ["name", "notes", "details"],
    );

    expect(csv).toBe(
      'name,notes,details\r\n"Course, ""Advanced""","line one\nline two","{""synthetic"":true}"',
    );
  });

  it("creates a ZIP with every CSV and an accurate JSON manifest", () => {
    const data = emptyExportData();
    data.members = [{ id: "synthetic-member", full_name: "Synthetic Member" }];
    const archive = createSemesterExportArchive({
      semester: { id: "synthetic-semester", name: "Fall Test" },
      generatedAt: "2026-09-09T12:00:00.000Z",
      data,
    });
    const files = unzipSync(archive);
    const manifest = JSON.parse(strFromU8(files["manifest.json"]!)) as {
      format: string;
      files: Record<string, { row_count: number }>;
    };

    expect(Object.keys(files)).toHaveLength(
      Object.keys(EXPORT_COLUMNS).length + 1,
    );
    expect(strFromU8(files["members.csv"]!)).toContain("Synthetic Member");
    expect(manifest.format).toBe("sigma-nu-scholarship-semester-export");
    expect(manifest.files["members.csv"]?.row_count).toBe(1);
    expect(manifest.files["grade_entries.csv"]?.row_count).toBe(0);
  });

  it("produces a safe deterministic download filename", () => {
    expect(safeExportFilename(" Fall 2026 / Test ")).toBe("fall-2026-test");
  });
});
