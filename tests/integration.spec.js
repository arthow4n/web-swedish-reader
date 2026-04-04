const { test, expect } = require('@playwright/test');

test.describe('Web Swedish Reader Core Flows', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL (managed by playwright webServer)
    await page.goto('/');
  });

  test('paste text and click words to view dictionaries', async ({ page, context }) => {
    // Check we start in edit mode with a blank article
    const article = page.locator('article');
    await expect(page.locator('body')).toHaveClass(/is-edit-mode/);
    await expect(article).toHaveAttribute('contenteditable', 'plaintext-only');

    // Simulate pasting text
    // The "Paste" button uses clipboard.readText() which needs permissions in playwright
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.evaluate(() => navigator.clipboard.writeText('Hej världen, detta är ett test.'));

    await page.click('.control-paste');

    // Should transition out of edit mode
    await expect(page.locator('body')).not.toHaveClass(/is-edit-mode/);

    // Words should be wrapped in spans and visible
    const words = page.locator('article .word');
    await expect(words).toHaveCount(6); // Hej, världen, detta, är, ett, test
    await expect(words.first()).toHaveText('Hej');

    // Click a word
    await words.nth(1).click(); // Click 'världen'

    // The dictionary input should be populated
    const dictInput = page.locator('.dics-query-input');
    await expect(dictInput).toHaveValue('världen');

    // It should fetch and display dictionaries (just checking iframe sources change or are visible)
    const dicsAside = page.locator('.dics');
    await expect(dicsAside).toBeVisible();

    // The selected word should have the selected class
    await expect(words.nth(1)).toHaveClass(/word-selected-in-area/);
  });

  test('open settings and toggle English reader mode', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.evaluate(() => navigator.clipboard.writeText('Hello world.'));
    await page.click('.control-paste');

    // Open settings
    await page.click('.control-settings');
    const settingsDialog = page.locator('.settings-modal');
    await expect(settingsDialog).toHaveAttribute('open', '');

    // Toggle English reader mode
    const englishModeCheckbox = page.locator('.settings-english-reader-mode-checkbox');
    await englishModeCheckbox.check();

    // Close settings
    await page.click('.settings-modal .control-settings-close:visible');
    await expect(settingsDialog).not.toHaveAttribute('open', '');

    // Words should still be there, but clicking them behaves differently (speaks English)
    // We just verify the setting took effect
    const isEnglishChecked = await englishModeCheckbox.isChecked();
    expect(isEnglishChecked).toBe(true);

    // Clicking a word in english mode doesn't select it as swedish word.
    const words = page.locator('article .word');
    await words.first().click();
    await expect(words.first()).not.toHaveClass(/word-selected-in-area/);
  });

  test('paste markdown and verify correct formatting', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const markdownText = `# Rubrik\n\n* En lista\n* Två saker`;
    await page.evaluate((text) => navigator.clipboard.writeText(text), markdownText);

    await page.click('.control-paste-markdown');

    await expect(page.locator('body')).not.toHaveClass(/is-edit-mode/);

    // Verify markdown was parsed
    const h1 = page.locator('article h1');
    await expect(h1).toBeVisible();
    await expect(h1.locator('.word').first()).toHaveText('Rubrik');

    const listItems = page.locator('article li');
    await expect(listItems).toHaveCount(2);

    // The dataset on article should reflect it's markdown
    const article = page.locator('article');
    await expect(article).toHaveAttribute('data-is-markdown', 'true');
  });

  test('clear text and return to edit mode', async ({ page, context }) => {
    // Add some text first
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.evaluate(() => navigator.clipboard.writeText('Test.'));
    await page.click('.control-paste');
    await expect(page.locator('body')).not.toHaveClass(/is-edit-mode/);

    // Click clear button in the top controls
    await page.click('.leading-controls .control-clear');

    // Should be back in edit mode and empty
    await expect(page.locator('body')).toHaveClass(/is-edit-mode/);
    const article = page.locator('article');
    await expect(article).toHaveText('');
  });

});
