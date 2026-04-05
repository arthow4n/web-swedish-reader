import { test, expect, Page, BrowserContext } from "@playwright/test";

test.describe("Security Vulnerability Tests", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.goto("/");
  });

  test("Stored XSS via Markdown Rendering", async ({
    page,
    context,
  }: {
    page: Page;
    context: BrowserContext;
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // XSS payload in markdown
    const xssPayload = `[click me](javascript:alert('XSS'))
<img src=x onerror=window.xssDetected=true>
<script>window.xssDetected=true</script>`;

    await page.evaluate(
      (text: string) => navigator.clipboard.writeText(text),
      xssPayload,
    );

    // Click "Paste Markdown"
    await page.click(".control-paste-markdown");

    // Wait for marked to be loaded and parsed
    await page.waitForSelector("article");

    // Check if XSS was executed
    const xssDetected = await page.evaluate(() => (window as any).xssDetected);
    expect(xssDetected).toBeUndefined();

    // Also check if script tag exists in the article
    const scriptCount = await page.locator("article script").count();
    expect(scriptCount).toBe(0);

    // Check if onerror attribute exists
    const imgWithOnerror = await page.locator("article img[onerror]").count();
    expect(imgWithOnerror).toBe(0);
  });
});
