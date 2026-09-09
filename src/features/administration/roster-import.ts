export type RosterMemberStatus = "active" | "inactive" | "alumni";

export type RosterImportRow = {
  rowNumber: number;
  firstName: string;
  lastName: string;
  fullName: string;
  status: RosterMemberStatus;
  issues: string[];
};

export type RosterImportPreview = {
  rows: RosterImportRow[];
  fatalErrors: string[];
};

export type ConfirmedRosterRow = Pick<
  RosterImportRow,
  "firstName" | "lastName" | "status"
>;

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeRosterName(value: string) {
  return normalizeWhitespace(value).toLocaleLowerCase("en-US");
}

function parseCsvRecords(input: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let closedQuote = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;

    if (inQuotes) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          closedQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (closedQuote) {
      if (character === ",") {
        record.push(field);
        field = "";
        closedQuote = false;
        continue;
      }
      if (character === "\n" || character === "\r") {
        record.push(field);
        records.push(record);
        record = [];
        field = "";
        closedQuote = false;
        if (character === "\r" && input[index + 1] === "\n") index += 1;
        continue;
      }
      if (/\s/.test(character)) continue;
      throw new Error("Unexpected text after a closing quote.");
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new Error("A quoted field must begin with a quote.");
      }
      inQuotes = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      if (character === "\r" && input[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error("A quoted field is not closed.");
  if (field.length > 0 || record.length > 0 || closedQuote) {
    record.push(field);
    records.push(record);
  }
  return records;
}

function canonicalHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[\s_-]+/g, "");
}

function statusFromCsv(value: string): RosterMemberStatus | null {
  const normalized = normalizeWhitespace(value).toLocaleLowerCase("en-US");
  if (!normalized) return "active";
  if (["active", "inactive", "alumni"].includes(normalized)) {
    return normalized as RosterMemberStatus;
  }
  return null;
}

export function prepareRosterImport(
  csv: string,
  existingMemberNames: string[] = [],
): RosterImportPreview {
  let records: string[][];
  try {
    records = parseCsvRecords(csv);
  } catch (error) {
    return {
      rows: [],
      fatalErrors: [
        error instanceof Error ? error.message : "The CSV could not be read.",
      ],
    };
  }

  if (records.length === 0) {
    return { rows: [], fatalErrors: ["The CSV file is empty."] };
  }

  const headers = records[0]!.map(canonicalHeader);
  const firstNameIndex = headers.indexOf("firstname");
  const lastNameIndex = headers.indexOf("lastname");
  const statusIndex = headers.indexOf("status");
  const fatalErrors: string[] = [];

  if (firstNameIndex === -1) fatalErrors.push('Missing "First Name" header.');
  if (lastNameIndex === -1) fatalErrors.push('Missing "Last Name" header.');
  for (const required of ["firstname", "lastname", "status"]) {
    if (headers.filter((header) => header === required).length > 1) {
      fatalErrors.push(`The "${required}" header appears more than once.`);
    }
  }
  if (fatalErrors.length > 0) return { rows: [], fatalErrors };

  const knownNames = new Set(existingMemberNames.map(normalizeRosterName));
  const namesInFile = new Set<string>();
  const rows: RosterImportRow[] = [];

  for (let index = 1; index < records.length; index += 1) {
    const record = records[index]!;
    if (record.every((value) => normalizeWhitespace(value) === "")) continue;

    const firstName = normalizeWhitespace(record[firstNameIndex] ?? "");
    const lastName = normalizeWhitespace(record[lastNameIndex] ?? "");
    const fullName = normalizeWhitespace(`${firstName} ${lastName}`);
    const status = statusFromCsv(
      statusIndex === -1 ? "" : (record[statusIndex] ?? ""),
    );
    const issues: string[] = [];

    if (!firstName) issues.push("First name is required.");
    if (!lastName) issues.push("Last name is required.");
    if (firstName.length > 100) issues.push("First name is too long.");
    if (lastName.length > 100) issues.push("Last name is too long.");
    if (fullName.length > 150) issues.push("Full name is too long.");
    if (!status) issues.push("Status must be Active, Inactive, or Alumni.");
    if (
      record.length > headers.length &&
      record.slice(headers.length).some((value) => value.trim() !== "")
    ) {
      issues.push("Row has more fields than the header.");
    }

    const normalizedName = normalizeRosterName(fullName);
    if (knownNames.has(normalizedName)) {
      issues.push("A member with this name already exists.");
    } else if (namesInFile.has(normalizedName)) {
      issues.push("Duplicate member in this file.");
    } else if (firstName && lastName) {
      namesInFile.add(normalizedName);
    }

    rows.push({
      rowNumber: index + 1,
      firstName,
      lastName,
      fullName,
      status: status ?? "active",
      issues,
    });
  }

  if (rows.length === 0) fatalErrors.push("The CSV has no member rows.");
  return { rows, fatalErrors };
}

export function confirmedRosterRows(
  preview: RosterImportPreview,
): ConfirmedRosterRow[] {
  return preview.rows
    .filter((row) => row.issues.length === 0)
    .map(({ firstName, lastName, status }) => ({
      firstName,
      lastName,
      status,
    }));
}
