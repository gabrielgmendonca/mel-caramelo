# Créditos / Credits

"Mel: A Vira-Lata Caramelo" uses the following third-party assets.
All other code, models, textures, and music are original to this project.

| Asset | Author | Source | License | File path |
| --- | --- | --- | --- | --- |
| Shiba Inu (Animated Animal Pack) | Quaternius | https://poly.pizza/m/y4wdQpg767 / https://quaternius.com | CC0 | public/assets/models/shiba.glb |
| SFX: jump, double jump, collect, bone, checkpoint, land (Digital Audio pack) | Kenney | https://kenney.nl/assets/digital-audio | CC0 | public/assets/audio/*.ogg |
| "Single Dog Bark" | kwahmah_02 | https://freesound.org/people/kwahmah_02/sounds/277058/ | CC0 | public/assets/audio/bark.mp3 |

## Original generated content

- **Favela environment** — procedurally generated stacked-box houses, stairs,
  cables, and laundry (`src/level/`, `src/textures/procedural.ts`).
- **Background music** — a tamborzão (baile funk) percussion loop rendered at
  runtime with WebAudio (`src/audio/AudioSystem.ts`). Drop a
  `public/assets/audio/music.mp3` in to replace it with a licensed track.
- **"Nota de 200"** — the collectible bill is an original parody artwork
  generated in code (`src/textures/nota200.ts`), an homage to the campaign to
  put the vira-lata caramelo on the real R$200 note. It is not a reproduction
  of any Banco Central do Brasil banknote and has no value, monetary or
  otherwise. Muito embora, se pudesse, valeria muito.
