// Mobile emulation tests: touch UI appears, joystick moves Mel, jump/bark
// buttons work, look-drag rotates the camera.
import { chromium, devices } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['iPhone 13 landscape'],
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
  if (!ok) failures++;
};

await page.goto('http://localhost:5174/');
await page.waitForTimeout(1500);

// 1. Touch title hint
const hint = await page.locator('.start-hint').textContent();
check('touch-title-hint', hint.includes('Toque'), `hint="${hint}"`);

await page.locator('.title-screen').tap();
await page.waitForTimeout(300);

// 2. Touch controls present
check('touch-ui-present', (await page.locator('.touch-btn').count()) === 3);

// helper: dispatch pointer events on an element
const drag = async (selector, from, to, holdMs, release = true) => {
  await page.evaluate(
    async ({ selector, from, to, holdMs, release }) => {
      const el = document.querySelector(selector);
      const ev = (type, x, y) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 7,
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        );
      ev('pointerdown', from.x, from.y);
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        ev(
          'pointermove',
          from.x + ((to.x - from.x) * i) / steps,
          from.y + ((to.y - from.y) * i) / steps,
        );
        await new Promise((r) => setTimeout(r, 30));
      }
      await new Promise((r) => setTimeout(r, holdMs));
      if (release) ev('pointerup', to.x, to.y);
    },
    { selector, from, to, holdMs, release },
  );
};

// 3. Joystick: push up-forward, Mel should advance in z
const z0 = await page.evaluate(() => window.__game.player.position.z);
await drag('.touch-zone-left', { x: 150, y: 280 }, { x: 150, y: 210 }, 1500);
const z1 = await page.evaluate(() => window.__game.player.position.z);
check('joystick-move', z1 - z0 > 3, `dz=${(z1 - z0).toFixed(1)}`);

// 4. Jump button: tap it, Mel leaves the ground
const jumpBtn = page.locator('.btn-jump');
await jumpBtn.dispatchEvent('pointerdown', { pointerId: 8, bubbles: true });
await page.waitForTimeout(250);
const airY = await page.evaluate(() => window.__game.player.position.y);
await jumpBtn.dispatchEvent('pointerup', { pointerId: 8, bubbles: true });
check('jump-button', airY > 1.0, `y=${airY.toFixed(2)}`);
await page.waitForTimeout(800);

// 5. Look drag rotates the camera yaw
const yaw0 = await page.evaluate(() => window.__game.cameraRig.yaw);
await drag('.touch-zone-right', { x: 600, y: 200 }, { x: 450, y: 200 }, 100);
const yaw1 = await page.evaluate(() => window.__game.cameraRig.yaw);
check('look-drag', Math.abs(yaw1 - yaw0) > 0.3, `dyaw=${(yaw1 - yaw0).toFixed(2)}`);

// 6. Bark button scares the praça pigeon
await page.evaluate(() => {
  window.__game.player.body.setTranslation({ x: 2, y: 1, z: 5 }, true);
});
await page.waitForTimeout(300);
const barkBtn = page.locator('.btn-bark');
await barkBtn.dispatchEvent('pointerdown', { pointerId: 9, bubbles: true });
await barkBtn.dispatchEvent('pointerup', { pointerId: 9, bubbles: true });
await page.waitForTimeout(3100);
const pigeonGone = await page.evaluate(() => !window.__game.pigeons[0].root.visible);
check('bark-button', pigeonGone);

// 7. Pause button
const pauseBtn = page.locator('.btn-pause');
await pauseBtn.dispatchEvent('pointerdown', { pointerId: 10, bubbles: true });
await page.waitForTimeout(200);
check('pause-button', (await page.evaluate(() => window.__game.state)) === 'paused');

await page.screenshot({ path: '/tmp/mel-mobile.png' });
const realErrors = errors.filter((e) => !e.includes('pointer lock'));
check('no-page-errors', realErrors.length === 0, realErrors.join('; '));

await browser.close();
process.exit(failures ? 1 : 0);
