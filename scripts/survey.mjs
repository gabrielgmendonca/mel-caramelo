import { chromium } from 'playwright';
const spots = [
  ['alley', '0,4.5,24'],
  ['roofB2', '8.5,9.6,27'],
  ['platform', '0,10.5,29'],
  ['t2', '0,8.5,38'],
  ['summit', '0,12.5,50'],
  ['tower', '6.5,17.5,52.5'],
];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
for (const [name, spawn] of spots) {
  await page.goto(`http://localhost:5174/?spawn=${spawn}`);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `/tmp/survey-${name}.png` });
}
await browser.close();
console.log('done');
