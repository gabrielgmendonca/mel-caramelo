# Mel: A Vira-Lata Caramelo 🐕🇧🇷

A 3D platformer for the browser starring **Mel**, a caramel-colored Brazilian
stray dog, exploring the **Morro do Caramelo** — a stylized hillside favela —
collecting parody **"notas de 200"** and hunting for hidden **Ossos de Ouro**.

Inspired by *Stray* (mood, third-person camera, rooftop traversal),
*Super Mario 64* / *Astro Bot* (free jumping, double jump, collectibles),
*Crash Bandicoot* (hazards, moving platforms) and *Banjo-Kazooie*
(hidden hero collectibles).

## Play

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click to start.

| Action | Keyboard / Mouse | Gamepad |
| --- | --- | --- |
| Run | WASD / arrows | Left stick |
| Jump (press again mid-air to double jump) | Space | A |
| Bark (scares pigeons!) | B | X |
| Camera | Mouse | Right stick |
| Pause | Esc / P | Start |

There are **31 notas de 200** and **4 Ossos de Ouro**. Checkpoints (small
flags) save your respawn point; falling off the morro sends you back to the
last one.

## Tech

- [Three.js](https://threejs.org) rendering, vanilla TypeScript, Vite
- [Rapier](https://rapier.rs) WASM physics with a kinematic character
  controller (coyote time, jump buffering, moving-platform carry, autostep
  for all those favela stairs)
- The favela is fully procedural: stacked-box houses with jittered floors,
  palette-painted walls, corrugated canvas-texture roofs, sagging power
  cables and swaying laundry lines
- The R$200 bill and the HUD icons are drawn in code on canvases; the
  soundtrack is a tamborzão loop rendered with WebAudio at runtime
- Every external asset has a procedural fallback — the game builds and plays
  even fully offline (boxy fallback dog included)

## Dev extras

- `?spawn=x,y,z` URL param teleports Mel for playtesting
- `F3` toggles a frame-time/draw-call readout
- `node scripts/route-test.mjs` and `node scripts/m4-test.mjs` run headless
  Playwright gameplay checks (needs `npm run dev` on port 5174)

Asset licensing in [CREDITS.md](CREDITS.md).
