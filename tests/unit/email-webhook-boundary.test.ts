import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Resend webhook boundary", () => {
  it("verifies all Svix signature headers before using privileged access", () => {
    const route = source("src/app/api/webhooks/resend/route.ts");
    expect(route).toContain('request.headers.get("svix-id")');
    expect(route).toContain('request.headers.get("svix-timestamp")');
    expect(route).toContain('request.headers.get("svix-signature")');
    expect(route.indexOf("verifyResendWebhook")).toBeLessThan(
      route.indexOf("createPrivilegedClient()"),
    );
  });

  it("keeps the webhook secret and privileged client out of browser modules", () => {
    const route = source("src/app/api/webhooks/resend/route.ts");
    expect(route).toContain("RESEND_WEBHOOK_SECRET");
    expect(route).toContain("createPrivilegedClient");
    expect(route).not.toContain("NEXT_PUBLIC_RESEND");
  });
});
