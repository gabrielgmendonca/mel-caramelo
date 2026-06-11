// Headless smoke test: loads the game, captures console errors, simulates
// movement/jumps, and screenshots. Usage: node scripts/smoke.mjs [url] [outPrefix]
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5174/';
const out = process.argv[3] ?? '/tmp/mel';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    errors.push(`[${msg.type()}] ${msg.text()}`);
  }
});
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

await page.goto(url);
await page.waitForTimeout(2000);
await page.mouse.click(640, 360); // dismiss title screen
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}-1-loaded.png` });

// Walk forward and jump twice (double jump)
await page.keyboard.down('KeyW');
await page.waitForTimeout(900);
await page.keyboard.press('Space');
await page.waitForTimeout(250);
await page.keyboard.press('Space');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}-2-doublejump.png` });
await page.waitForTimeout(900);
await page.keyboard.up('KeyW');
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}-3-landed.png` });

// Bark (no-op until M4, harmless)
await page.keyboard.press('KeyB');
await page.waitForTimeout(400);

console.log(errors.length ? `CONSOLE ISSUES:\n${errors.join('\n')}` : 'CONSOLE CLEAN');
await browser.close();
