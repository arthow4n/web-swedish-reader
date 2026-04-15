import { test, expect } from "@playwright/test";

test("remote alternatives should include the queried word", async ({
  page,
  context,
}) => {
  await page.route(
    "https://fetch-swe-compounds.deno.dev/analyse**",
    async (route) => {
      const json = [
        {
          upstream: "saol",
          baseform: "gåshud",
          compounds: [],
          compoundsLemma: ["gås", "hud"],
          definitions: ["knottrig hud av skräck el. kyla"],
        },
      ];
      await route.fulfill({ json });
    },
  );

  await page.goto("/");

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(() => navigator.clipboard.writeText("gåshuden"));
  await page.click(".control-paste");

  await page.click("article .word");

  // Wait for the remote alternative to be populated
  await page.waitForTimeout(2000);

  const remoteAlt = await page.textContent(".query-alternatives-line-remote");
  expect(remoteAlt).toContain("gåshuden");
  expect(remoteAlt).toContain("gåshud");
});
