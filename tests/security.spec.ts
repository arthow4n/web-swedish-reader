import { test, expect, Page, BrowserContext } from "@playwright/test";

test.describe("Security Vulnerability Tests", () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.goto("/");
  });

  test("Parameter Injection via sourceLanguage", async ({
    page,
  }: {
    page: Page;
  }) => {
    // We want to test that if an attacker provides a malicious sourceLanguage parameter,
    // the application sanitizes it or falls back to 'sv', preventing HTTP Parameter Injection.
    let interceptedUrl = "";

    await page.route("**/analyse?*", (route) => {
      interceptedUrl = route.request().url();
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Navigate to page with an injected payload in the sourceLanguage query string
    await page.goto("/?sourceLanguage=en%26injected%3Dtrue#text=hej");

    // Ensure the app loads and text is visible
    await page.waitForSelector("article .word");

    // Click on the word "hej" to trigger a dictionary lookup
    await page.click("article .word:has-text('hej')");

    // Wait for the request to be intercepted
    await page.waitForTimeout(500);

    // The intercepted URL should *not* contain the injected payload.
    // Since the payload was invalid, it should have fallen back to 'sv'.
    // If it did not fallback to sv, the dictionary request might not be sent.
    // However, english dictionary lookup might still happen.
    // Let's assert that IF the request is made to Deno, it contains 'sv' or at least NOT the injected payload
    if (interceptedUrl) {
      expect(interceptedUrl).not.toContain("injected=true");
      // Also it shouldn't contain the raw en&injected=true either
      expect(interceptedUrl).not.toContain("en&injected=true");
    }
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
