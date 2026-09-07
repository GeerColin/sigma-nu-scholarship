import { describe, expect, it } from "vitest";
import {
  applyBatchEdit,
  applyIndividualEdit,
  renderEmailTemplate,
  validateTemplate,
  type PreparedEmail,
} from "@/lib/email/templates";

describe("email template rendering", () => {
  it("renders only allowed variables", () => {
    expect(
      renderEmailTemplate(
        {
          subject: "{{weekLabel}} study hours",
          body: "Hi {{memberName}}, you have {{remainingHours}} hours remaining.",
        },
        { weekLabel: "Week 5", memberName: "Alex", remainingHours: 1 },
      ),
    ).toEqual({
      subject: "Week 5 study hours",
      body: "Hi Alex, you have 1 hours remaining.",
    });
  });

  it("rejects unknown variables and missing values", () => {
    expect(() =>
      validateTemplate({ subject: "Hello", body: "{{privateGrade}}" }),
    ).toThrow("Unsupported email template variable");
    expect(() =>
      renderEmailTemplate({ subject: "{{weekLabel}}", body: "Ready" }, {}),
    ).toThrow("Missing email template value");
  });
});

describe("prepared email editing", () => {
  const messages: PreparedEmail[] = [
    {
      id: "a",
      recipientEmail: "alex@example.test",
      recipientName: "Alex",
      selected: true,
      finalSubject: "Original A",
      finalBody: "Body A",
    },
    {
      id: "b",
      recipientEmail: "blake@example.test",
      recipientName: "Blake",
      selected: true,
      finalSubject: "Original B",
      finalBody: "Body B",
    },
  ];

  it("applies a batch-wide final edit", () => {
    expect(
      applyBatchEdit(messages, "Updated", "Updated body").every(
        (message) =>
          message.finalSubject === "Updated" &&
          message.finalBody === "Updated body",
      ),
    ).toBe(true);
  });

  it("edits one recipient without changing the other", () => {
    const edited = applyIndividualEdit(
      messages,
      "a",
      "Personal",
      "Personal body",
    );
    expect(edited[0]).toMatchObject({
      finalSubject: "Personal",
      finalBody: "Personal body",
    });
    expect(edited[1]).toEqual(messages[1]);
  });
});
