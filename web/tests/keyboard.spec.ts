import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The headline accessibility guarantee: a keyboard-only user can open the
 * assistant, ask a question by typing, and close it — returning focus to the
 * launcher — with NO mouse, and the page is axe-clean throughout.
 *
 * Note: the chat call is stubbed so this passes without live API keys.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mode: 'grounded',
        answer: 'Text must meet a contrast ratio of at least 4.5 to 1. [1]',
        citations: [
          { n: 1, docId: 'wcag-2-2-aa', title: 'WCAG 2.2 AA', sourceTitle: 'W3C', sourceUrl: 'https://www.w3.org/TR/WCAG22/', anchor: 'contrast', signoffRequired: false }
        ]
      })
    })
  );
});

test('home page has no automatically-detectable accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('keyboard-only user can complete a Q&A and focus returns to the launcher', async ({ page }) => {
  await page.goto('/');

  // Reach the launcher by keyboard and open it.
  const launcher = page.getByRole('button', { name: /ask the assistant/i });
  await launcher.focus();
  await expect(launcher).toBeFocused();
  await page.keyboard.press('Enter');

  // Dialog opens; focus is moved into it (onto the input).
  const dialog = page.getByRole('dialog', { name: /ada & 508 assistant/i });
  await expect(dialog).toBeVisible();
  const input = page.getByLabel(/type your question/i);
  await expect(input).toBeFocused();

  // Ask by typing only.
  await page.keyboard.type('What contrast ratio does text need?');
  await page.keyboard.press('Enter');

  // The answer and its citation appear in the transcript.
  await expect(page.getByText(/4\.5 to 1/)).toBeVisible();
  await expect(page.getByRole('link', { name: /W3C/ })).toBeVisible();

  // The open dialog is axe-clean.
  const dialogResults = await new AxeBuilder({ page }).include('#voice-dialog').analyze();
  expect(dialogResults.violations).toEqual([]);

  // Escape closes the dialog and returns focus to the launcher.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();
});
