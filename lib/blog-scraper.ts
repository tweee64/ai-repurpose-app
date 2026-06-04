import { chromium } from 'playwright';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const NAVIGATION_TIMEOUT_MS = 30_000;

export interface ScrapedArticle {
  title: string | null;
  text: string;
}

/**
 * Fetches a blog/article URL using headless Chromium, extracts the main body
 * text using Readability, and returns plain text. Throws on timeout or empty
 * content so the caller can persist a descriptive errorMessage.
 *
 * Server-side only — never import in Client Components.
 */
export async function scrapeBlogUrl(url: string): Promise<ScrapedArticle> {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    try {
      await page.goto(url, {
        timeout: NAVIGATION_TIMEOUT_MS,
        waitUntil: 'domcontentloaded',
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new Error('Page took too long to load. Try a different URL.');
      }
      throw err;
    }

    const html = await page.content();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article && article.textContent && article.textContent.trim().length > 50) {
      return {
        title: article.title ?? null,
        text: article.textContent.trim(),
      };
    }

    // Fallback: grab raw body text
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    const trimmed = bodyText.trim();

    if (!trimmed || trimmed.length < 50) {
      throw new Error(
        'No readable content found. The page may be paywalled or JavaScript-only.',
      );
    }

    return { title: null, text: trimmed };
  } finally {
    await browser.close();
  }
}
