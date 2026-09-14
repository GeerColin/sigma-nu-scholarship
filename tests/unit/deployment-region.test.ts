import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel database locality", () => {
  it("pins a single Oregon function region beside the hosted us-west-2 database", () => {
    const configuration: unknown = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
    );

    expect(configuration).toEqual({
      $schema: "https://openapi.vercel.sh/vercel.json",
      regions: ["pdx1"],
    });
  });
});
