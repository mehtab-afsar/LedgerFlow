/**
 * Renders docs/pitch-deck.html to a PDF on the Desktop.
 *
 * Unlike LogiFlow's react-pdf deck, this one is plain HTML/CSS rendered by
 * Chromium — the "screenshots" in it are real captures of the running app
 * (see scripts/deck-shots.mjs), not react-pdf mockups, so there's no reason
 * to route it through the app's own PDF engine.
 *
 *   node scripts/deck-shots.mjs   # capture fresh screenshots first
 *   node scripts/build-deck.mjs
 */
import { chromium } from "@playwright/test";
import path from "node:path";
import os from "node:os";

const HTML_PATH = path.resolve("docs/pitch-deck.html");
const OUT_PATH = path.join(os.homedir(), "Desktop", "LedgerFlow-pitch-deck.pdf");

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${HTML_PATH}`);
  await page.waitForTimeout(300); // let web fonts settle
  await page.pdf({
    path: OUT_PATH,
    width: "13.333in",
    height: "7.5in",
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  await browser.close();
  console.log(`\n  ${OUT_PATH}\n`);
}

main().catch((err) => {
  console.error("Deck build failed:", err);
  process.exit(1);
});
