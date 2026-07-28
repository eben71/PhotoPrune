import { expect, type Page } from "playwright/test";

const forbiddenPatterns = [
  /\b\d{1,3}(?:\.\d+)?\s*(?:%|percent)\s*[-:–—]?\s*(?:match|similar|similarity|confidence)\b/i,
  /\b(?:match|similar|similarity|confidence)(?:\s+score)?\s*[-:–—]?\s*\d{1,3}(?:\.\d+)?\s*(?:%|percent)\b/i,
  /neural engine/i,
  /digital curator engine/i,
  /deep scan/i,
  /photos pruned/i,
  /recover deleted items/i,
  /\b(?:has|uses?|requires?|requests?|grants?)\s+(?:google photos\s+)?write (?:access|scope)\b/i,
  /storage reclaimed/i,
  /local-only/i,
];

export async function expectNoUnsupportedClaims(page: Page) {
  const visibleText = await page.locator("body").innerText();
  for (const pattern of forbiddenPatterns) {
    expect(visibleText, `Unsupported claim matched ${pattern}`).not.toMatch(
      pattern,
    );
  }
}
