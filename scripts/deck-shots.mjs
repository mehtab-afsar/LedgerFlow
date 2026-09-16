import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const APP_URL = "http://localhost:3001";
const MAILPIT_URL = "http://127.0.0.1:55324";
const EMAIL = "karthik@sundaramfreight.example";

const OUT_DIR = "docs/deck-shots";
mkdirSync(OUT_DIR, { recursive: true });

async function latestSignInLink(email) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=to:${encodeURIComponent(email)}&limit=1`);
    const body = await res.json();
    if (body.messages?.length) {
      const id = body.messages[0].ID;
      const msg = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`).then((r) => r.json());
      const match = msg.Text.match(/http:\/\/127\.0\.0\.1:55321\/auth\/v1\/verify\?[^\s)]+/);
      if (match) return match[0];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("No sign-in email arrived in Mailpit");
}

/**
 * Full-viewport screenshots leave a lot of empty paper-colour space below
 * short pages, which wastes most of a deck slide. Clip to the actual
 * rendered content height (plus a small margin) instead.
 */
async function shootContent(page, path) {
  // The authed shell's <main> and its ancestors are all min-h-dvh/flex-1, so
  // they stretch to the full viewport regardless of content — measure the
  // panel's own root div (main's direct child) instead, which sizes to its
  // actual content.
  const height = await page.evaluate(() => {
    const el = document.querySelector("main > div");
    const bottom = el ? el.getBoundingClientRect().bottom : window.innerHeight;
    return Math.min(Math.ceil(bottom) + 32, window.innerHeight);
  });
  await page.screenshot({ path, clip: { x: 0, y: 0, width: 1440, height } });
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  // Drive the real sign-in UI so the PKCE code_verifier this client stores
  // is the one the emailed link's code actually matches — no faked cookies.
  await page.goto(`${APP_URL}/login`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByRole("button", { name: "Send me a sign-in link" }).click();
  await page.getByText("Check your email.").waitFor();

  const link = await latestSignInLink(EMAIL);
  await page.goto(link);
  await page.waitForURL(`${APP_URL}/dashboard`, { timeout: 15000 });
  console.log("Authenticated, landed on", page.url());

  await page.waitForTimeout(800);
  await shootContent(page, `${OUT_DIR}/dashboard.png`);

  await page.goto(`${APP_URL}/invoices`);
  await page.waitForTimeout(600);
  await shootContent(page, `${OUT_DIR}/invoices.png`);

  await page.goto(`${APP_URL}/parties`);
  await page.waitForTimeout(600);
  await shootContent(page, `${OUT_DIR}/parties.png`);

  await page.goto(`${APP_URL}/service-completions`);
  await page.waitForTimeout(600);
  await shootContent(page, `${OUT_DIR}/service-completions.png`);

  await page.goto(`${APP_URL}/receipts`);
  await page.waitForTimeout(600);
  await shootContent(page, `${OUT_DIR}/receipts.png`);

  // Invoice creation form, mid-fill.
  await page.goto(`${APP_URL}/invoices`);
  await page.getByRole("button", { name: "New invoice" }).click();
  await page.waitForTimeout(300);
  await page.locator("select").first().selectOption({ label: "Kaveri Textiles Pvt Ltd" });
  await page.waitForTimeout(400);
  // Scoped to the eligible-services <ul> — the tax-exempt toggle is also a
  // checkbox on this form and must stay untouched.
  const checkboxes = page.locator('ul input[type="checkbox"]');
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) await checkboxes.nth(i).check();
  await page.locator('input[type="date"]').first().fill("2026-10-15");
  await page.waitForTimeout(200);
  await shootContent(page, `${OUT_DIR}/invoice-form.png`);

  await context.close();

  // Signed-out surfaces.
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`${APP_URL}/`);
  await publicPage.waitForTimeout(700);
  await publicPage.screenshot({ path: `${OUT_DIR}/landing.png` });

  await publicPage.evaluate(() => {
    const el = document.getElementById("outstanding");
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 40);
  });
  await publicPage.waitForTimeout(900);
  await publicPage.screenshot({ path: `${OUT_DIR}/landing-outstanding.png` });

  await publicPage.goto(`${APP_URL}/start`);
  await publicPage.waitForTimeout(500);
  await publicPage.screenshot({ path: `${OUT_DIR}/start.png` });

  await browser.close();
  console.log("Screenshots saved to", OUT_DIR);
}

main().catch((err) => {
  console.error("Screenshot run failed:", err);
  process.exit(1);
});
