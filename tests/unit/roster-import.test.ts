import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  confirmedRosterRows,
  prepareRosterImport,
} from "@/features/administration/roster-import";
import { rosterImportSchema } from "@/features/administration/roster-import-validation";

describe("CSV roster import", () => {
  it("uses an explicit submit button for the confirmed import action", () => {
    const form = readFileSync(
      resolve(
        process.cwd(),
        "src/features/administration/roster-import-form.tsx",
      ),
      "utf8",
    );

    expect(form).toMatch(
      /<Button\s+type="submit"\s+disabled=\{!confirmed \|\| readyRows\.length === 0 \|\| pending\}/,
    );
  });

  it("parses valid rows, trims names, and defaults blank status to Active", () => {
    const preview = prepareRosterImport(
      "First Name,Last Name,Status\r\n  Ada  , Lovelace ,\r\nGrace,Hopper,Inactive",
    );

    expect(preview.fatalErrors).toEqual([]);
    expect(confirmedRosterRows(preview)).toEqual([
      { firstName: "Ada", lastName: "Lovelace", status: "active" },
      { firstName: "Grace", lastName: "Hopper", status: "inactive" },
    ]);
  });

  it("accepts the required headers without a Status column", () => {
    const preview = prepareRosterImport("First Name,Last Name\nAlan,Turing");
    expect(confirmedRosterRows(preview)).toEqual([
      { firstName: "Alan", lastName: "Turing", status: "active" },
    ]);
  });

  it("excludes duplicate names within one file", () => {
    const preview = prepareRosterImport(
      "First Name,Last Name\nAda,Lovelace\n  ada , LOVELACE ",
    );
    expect(preview.rows[0]?.issues).toEqual([]);
    expect(preview.rows[1]?.issues).toContain("Duplicate member in this file.");
    expect(confirmedRosterRows(preview)).toHaveLength(1);
  });

  it("excludes names that already exist on an accidental re-import", () => {
    const preview = prepareRosterImport(
      "First Name,Last Name,Status\nAda,Lovelace,Alumni",
      ["  ADA   LOVELACE "],
    );
    expect(preview.rows[0]?.issues).toContain(
      "A member with this name already exists.",
    );
    expect(confirmedRosterRows(preview)).toEqual([]);
  });

  it("reports blank required names without dropping the other valid rows", () => {
    const preview = prepareRosterImport(
      "First Name,Last Name\n,Blank\nValid,Member",
    );
    expect(preview.rows[0]?.issues).toContain("First name is required.");
    expect(confirmedRosterRows(preview)).toEqual([
      { firstName: "Valid", lastName: "Member", status: "active" },
    ]);
  });

  it("rejects malformed quoted CSV", () => {
    const preview = prepareRosterImport(
      'First Name,Last Name\n"Unclosed,Member',
    );
    expect(preview.rows).toEqual([]);
    expect(preview.fatalErrors).toContain("A quoted field is not closed.");
  });

  it("reports invalid statuses in a mixed-validity file", () => {
    const preview = prepareRosterImport(
      "First Name,Last Name,Status\nReady,Member,Active\nBad,Member,Pending",
    );
    expect(preview.rows[1]?.issues).toContain(
      "Status must be Active, Inactive, or Alumni.",
    );
    expect(confirmedRosterRows(preview)).toEqual([
      { firstName: "Ready", lastName: "Member", status: "active" },
    ]);
  });

  it("requires explicit confirmation again at the trusted server boundary", () => {
    const rows = [{ firstName: "Ada", lastName: "Lovelace", status: "active" }];
    expect(
      rosterImportSchema.safeParse({ confirmed: null, rows }).success,
    ).toBe(false);
    expect(
      rosterImportSchema.safeParse({ confirmed: "yes", rows }).success,
    ).toBe(true);
  });
});
