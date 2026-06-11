// M4 functional tests: nota pickup, bark→pigeon flee, checkpoint respawn, HUD.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
  if (!ok) failures++;
};

const start = async (spawn) => {
  await page.goto(`http://localhost:5174/?spawn=${spawn}`);
  await page.waitForTimeout(900);
  await page.mouse.click(640, 360);
  await page.waitForTimeout(200);
};

// 1. Collect the praça nota trail by walking forward.
await start('0,1,2');
await page.keyboard.down('KeyW');
await page.waitForTimeout(1600);
await page.keyboard.up('KeyW');
const notas = await page.evaluate(() => window.__game.notasCollected);
check('nota-pickup', notas >= 2, `collected=${notas}`);
const hudText = await page.locator('.hud-row').first().textContent();
check('hud-counter', hudText.includes(`${notas}/31`), `hud="${hudText}"`);

// 2. Bark scares the nearby pigeon (pigeon at 3,0,5).
await start('1,1,5');
const visibleBefore = await page.evaluate(() => window.__game.pigeons[0].root.visible);
await page.keyboard.press('KeyB');
await page.waitForTimeout(3000); // flee lasts 2.5s then hides
const visibleAfter = await page.evaluate(
  () => window.__game.pigeons[0].root.visible,
);
check('bark-pigeon-flee', visibleBefore && !visibleAfter, `before=${visibleBefore} after=${visibleAfter}`);

// 3. Checkpoint: walk through the first checkpoint volume, then die — should
// respawn at the checkpoint, not the original spawn.
await start('0,4.5,20');
await page.keyboard.down('KeyW');
await page.waitForTimeout(400);
await page.keyboard.up('KeyW');
const activated = await page.evaluate(() => window.__game.checkpoints[0].activated);
check('checkpoint-activate', activated);
// walk off the east edge of T1 to die
await page.evaluate(() => {
  window.__game.player.body.setTranslation({ x: 23, y: 2, z: 27 }, true);
});
await page.waitForTimeout(2500);
const pos = await page.evaluate(() => {
  const p = window.__game.player.position;
  return { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1) };
});
check('checkpoint-respawn', Math.abs(pos.z - 21) < 2 && pos.y > 3, JSON.stringify(pos));

// 4. Golden bone pickup (water tower bone).
await start('6.5,17.5,52.5');
await page.waitForTimeout(800);
const bones = await page.evaluate(() => window.__game.bonesCollected);
check('bone-pickup', bones === 1, `bones=${bones}`);
const toast = await page.locator('.hud-toast').textContent();
check('bone-toast', toast.includes('Osso de Ouro'), `toast="${toast}"`);

// 5. Pause menu via Escape.
await start('0,1,2');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const pausedVisible = await page.evaluate(
  () => !document.querySelector('.pause-menu').classList.contains('hidden'),
);
const stateNow = await page.evaluate(() => window.__game.state);
check('pause-menu', pausedVisible || stateNow === 'paused', `state=${stateNow}`);

const realErrors = errors.filter((e) => !e.includes('pointer lock'));
check('no-page-errors', realErrors.length === 0, realErrors.join('; '));

await browser.close();
process.exit(failures ? 1 : 0);
