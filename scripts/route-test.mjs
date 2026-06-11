// Functional route tests: stairs autostep, moving-platform carry, kill-plane respawn.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

const playerPos = () =>
  page.evaluate(() => {
    const p = window.__game.player.position;
    return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) };
  });

const origGoto = page.goto.bind(page);
page.goto = async (url) => {
  await origGoto(url);
  await page.waitForTimeout(800);
  await page.mouse.click(640, 360); // dismiss title screen
  await page.waitForTimeout(200);
};

let failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
  if (!ok) failures++;
};

// 1. Stairs autostep: walk up the praça stairs without jumping.
await page.goto('http://localhost:5174/?spawn=0,1,12');
await page.waitForTimeout(1500);
await page.keyboard.down('KeyW');
await page.waitForTimeout(3000);
await page.keyboard.up('KeyW');
let pos = await playerPos();
check('stairs-autostep', pos.y > 3.3 && pos.z > 19, JSON.stringify(pos));

// 2. Moving platform carry: spawn on the platform at t≈0, stand still, get carried.
await page.goto('http://localhost:5174/?spawn=5,10.4,31');
await page.waitForTimeout(4200); // platform: 0.8s pause + 3s trip
pos = await playerPos();
check('platform-carry', pos.x < -2 && pos.y > 8.5, JSON.stringify(pos));

// 3. Kill plane: walk off the praça edge, respawn at spawn point.
await page.goto('http://localhost:5174/?spawn=0,1,-8');
await page.waitForTimeout(1500);
await page.keyboard.down('KeyS');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyS');
await page.waitForTimeout(2500);
pos = await playerPos();
check('kill-respawn', pos.y > 0 && Math.abs(pos.z + 8) < 3, JSON.stringify(pos));

// 4. Double-jump height: hold the first jump past apex (no jump-cut), then
// press again mid-air. Peak should reach ~3m above ground.
await page.goto('http://localhost:5174/?spawn=0,1,5');
await page.waitForTimeout(1500);
const ground = (await playerPos()).y;
let peak = 0;
await page.keyboard.down('Space');
await page.waitForTimeout(420); // past first-jump apex
await page.keyboard.up('Space');
await page.keyboard.down('Space'); // double jump, held
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(50);
  const p = await playerPos();
  peak = Math.max(peak, p.y);
}
await page.keyboard.up('Space');
check('double-jump-height', peak - ground > 2.4, `gain=${(peak - ground).toFixed(2)}`);

// 5. Jump-cut: a tapped jump should stay clearly lower than a held one.
await page.goto('http://localhost:5174/?spawn=0,1,5');
await page.waitForTimeout(1500);
const g2 = (await playerPos()).y;
let tapPeak = 0;
await page.keyboard.press('Space');
for (let i = 0; i < 14; i++) {
  await page.waitForTimeout(50);
  const p = await playerPos();
  tapPeak = Math.max(tapPeak, p.y);
}
check('jump-cut', tapPeak - g2 < 1.3, `tap-gain=${(tapPeak - g2).toFixed(2)}`);

await browser.close();
process.exit(failures ? 1 : 0);
