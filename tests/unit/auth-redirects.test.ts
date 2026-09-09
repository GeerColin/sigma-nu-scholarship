import { describe, expect, it } from "vitest";
import {
  getOAuthCallbackUrl,
  getTrustedCallbackRedirect,
} from "@/lib/auth/redirects";

describe("OAuth redirects", () => {
  it.each([
    ["http://localhost:3000", "http://localhost:3000/auth/callback"],
    [
      "https://sigma-nu-scholarship.vercel.app/",
      "https://sigma-nu-scholarship.vercel.app/auth/callback",
    ],
  ])(
    "builds the callback from the configured application origin",
    (app, expected) => {
      expect(getOAuthCallbackUrl(app)).toBe(expected);
    },
  );

  it("preserves a safe same-origin relative destination", () => {
    expect(
      getTrustedCallbackRedirect(
        "/member/check-in?week=3#courses",
        "https://sigma-nu-scholarship.vercel.app",
      ).toString(),
    ).toBe(
      "https://sigma-nu-scholarship.vercel.app/member/check-in?week=3#courses",
    );
  });

  it.each([
    null,
    "https://attacker.example/",
    "//attacker.example/",
    "/\\attacker.example/",
    "javascript:alert(1)",
  ])("falls back to the site root for an untrusted next value", (next) => {
    expect(
      getTrustedCallbackRedirect(
        next,
        "https://sigma-nu-scholarship.vercel.app",
      ).toString(),
    ).toBe("https://sigma-nu-scholarship.vercel.app/");
  });
});
