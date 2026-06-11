export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlatformDef {
  pos: Vec3; // center
  size: Vec3; // full extents
  rotY?: number;
  color?: string;
}

export interface HouseDef {
  pos: Vec3; // ground center
  rotY: number;
  floors: number;
  w: number;
  d: number;
  palette?: number; // index into FAVELA_PALETTE
  roofTerrace?: boolean; // walkable flat roof with parapets (vs corrugated)
}

export interface StairsDef {
  pos: Vec3; // base, at the bottom step's leading edge
  rotY: number; // direction of ascent
  steps: number;
  width: number;
  stepHeight?: number; // default 0.18
  stepDepth?: number; // default 0.3
}

export interface MovingPlatformDef {
  from: Vec3;
  to: Vec3;
  size: Vec3;
  period: number; // seconds one-way
  pause?: number; // seconds paused at each end
  color?: string;
}

export interface WaterTowerDef {
  pos: Vec3; // ground center
  legHeight: number;
  tankRadius: number;
  tankHeight: number;
}

export interface CableDef {
  from: Vec3;
  to: Vec3;
  sag: number;
}

export interface LaundryDef {
  from: Vec3;
  to: Vec3;
}

export interface CheckpointDef {
  pos: Vec3;
  size: Vec3;
}

export interface LevelData {
  spawn: Vec3;
  killY: number;
  platforms: PlatformDef[];
  props: PlatformDef[]; // crates, boxes — small climbable clutter
  houses: HouseDef[];
  stairs: StairsDef[];
  movingPlatforms: MovingPlatformDef[];
  waterTowers: WaterTowerDef[];
  cables: CableDef[];
  laundry: LaundryDef[];
  notas: Vec3[];
  bones: Vec3[];
  pigeons: Vec3[];
  checkpoints: CheckpointDef[];
}

const PI = Math.PI;

/**
 * "Morro do Caramelo" — a terraced hillside favela.
 *
 * Route: spawn praça (y=0) → wide stairs → alley tier (y=3.5) with a
 * crate-climb onto the rooftops (y≈6–9) → moving platform across the alley →
 * upper terrace (y=7.5) → stairs → summit (y=11.5) with the water tower
 * (final golden bone at y≈17).
 */
export const LEVEL: LevelData = {
  spawn: { x: 0, y: 1.5, z: 0 },
  killY: -10,

  platforms: [
    // terrace slabs — the hill itself
    { pos: { x: 0, y: -0.5, z: 5 }, size: { x: 44, y: 1, z: 30 }, color: '#b09a7e' }, // praça, top y=0
    { pos: { x: 0, y: 1.75, z: 27.5 }, size: { x: 44, y: 3.5, z: 15 }, color: '#a8917a' }, // T1, top y=3.5
    { pos: { x: 0, y: 3.75, z: 41.5 }, size: { x: 44, y: 7.5, z: 13 }, color: '#b09a7e' }, // T2, top y=7.5
    { pos: { x: 0, y: 5.75, z: 54 }, size: { x: 44, y: 11.5, z: 12 }, color: '#a8917a' }, // summit, top y=11.5
    // hidden ledge on the east flank (golden bone #3)
    { pos: { x: 20, y: 9.25, z: 47.5 }, size: { x: 2.5, y: 0.5, z: 2.5 }, color: '#8d7a64' },
  ],

  props: [
    // praça clutter
    { pos: { x: -3, y: 0.45, z: 2 }, size: { x: 0.9, y: 0.9, z: 0.9 } },
    { pos: { x: 10, y: 0.45, z: 9 }, size: { x: 0.9, y: 0.9, z: 0.9 } },
    { pos: { x: 11, y: 0.6, z: 9.8 }, size: { x: 0.6, y: 1.2, z: 0.6 }, color: '#7a4f2d' },
    // crate climb onto the b1 roof (start of the rooftop route)
    { pos: { x: 4.8, y: 3.95, z: 21 }, size: { x: 0.9, y: 0.9, z: 0.9 } },
    { pos: { x: 6.3, y: 3.95, z: 22.3 }, size: { x: 0.9, y: 0.9, z: 0.9 } },
    { pos: { x: 6.3, y: 4.85, z: 22.3 }, size: { x: 0.9, y: 0.9, z: 0.9 } },
    // utility box on the b1 roof — step up toward b2's terrace
    { pos: { x: 7, y: 6.64, z: 25 }, size: { x: 1, y: 1, z: 1 }, color: '#8a9296' },
    // crate back up to the hidden flank ledge
    { pos: { x: 18, y: 7.95, z: 45.5 }, size: { x: 0.9, y: 0.9, z: 0.9 } },
    // summit crates up to the s3 roof
    { pos: { x: 12.5, y: 11.95, z: 53 }, size: { x: 0.9, y: 0.9, z: 0.9 } },
    { pos: { x: 12.5, y: 11.95, z: 54.5 }, size: { x: 0.9, y: 0.9, z: 0.9 } },
    { pos: { x: 12.5, y: 12.85, z: 54.5 }, size: { x: 0.9, y: 0.9, z: 0.9 } },
  ],

  houses: [
    // praça (T0)
    { pos: { x: -14, y: 0, z: 2 }, rotY: PI / 2, floors: 2, w: 4.5, d: 4, palette: 0, roofTerrace: true },
    { pos: { x: -15, y: 0, z: 8 }, rotY: PI / 2, floors: 1, w: 4, d: 4, palette: 2 },
    { pos: { x: -14, y: 0, z: 14 }, rotY: PI / 2, floors: 2, w: 4, d: 4.5, palette: 6 },
    { pos: { x: 14, y: 0, z: 1 }, rotY: -PI / 2, floors: 2, w: 4.5, d: 4, palette: 3, roofTerrace: true },
    { pos: { x: 15, y: 0, z: 7.5 }, rotY: -PI / 2, floors: 1, w: 4, d: 4, palette: 4 },
    { pos: { x: 14, y: 0, z: 13.5 }, rotY: -PI / 2, floors: 2, w: 4, d: 4, palette: 1, roofTerrace: true },
    { pos: { x: -6, y: 0, z: 16.5 }, rotY: PI, floors: 1, w: 4, d: 3.5, palette: 7 },
    { pos: { x: 6, y: 0, z: 16.5 }, rotY: PI, floors: 2, w: 4, d: 3.5, palette: 5, roofTerrace: true },

    // alley tier (T1, base 3.5) — row A west, row B east; rooftop route on row B
    { pos: { x: -8, y: 3.5, z: 23 }, rotY: PI / 2, floors: 2, w: 4, d: 4, palette: 5 },
    { pos: { x: -8.5, y: 3.5, z: 28.5 }, rotY: PI / 2, floors: 1, w: 4, d: 4, palette: 2, roofTerrace: true },
    { pos: { x: -8, y: 3.5, z: 33 }, rotY: PI / 2, floors: 2, w: 4, d: 4, palette: 7, roofTerrace: true },
    { pos: { x: 8, y: 3.5, z: 22.5 }, rotY: -PI / 2, floors: 1, w: 4, d: 4, palette: 1 }, // b1: crate climb here
    { pos: { x: 8.5, y: 3.5, z: 27 }, rotY: -PI / 2, floors: 2, w: 4, d: 4.5, palette: 0, roofTerrace: true }, // b2
    { pos: { x: 8, y: 3.5, z: 32 }, rotY: -PI / 2, floors: 2, w: 4, d: 4, palette: 3, roofTerrace: true }, // b3

    // upper terrace (T2, base 7.5)
    { pos: { x: -14, y: 7.5, z: 38 }, rotY: PI / 2, floors: 2, w: 4.5, d: 4, palette: 4, roofTerrace: true },
    { pos: { x: -13.5, y: 7.5, z: 44 }, rotY: PI / 2, floors: 1, w: 4, d: 4, palette: 6 },
    { pos: { x: -3, y: 7.5, z: 45.5 }, rotY: PI, floors: 2, w: 5, d: 4, palette: 0, roofTerrace: true },
    { pos: { x: 16, y: 7.5, z: 38 }, rotY: -PI / 2, floors: 1, w: 4, d: 4, palette: 2 },
    { pos: { x: 6, y: 7.5, z: 44 }, rotY: PI, floors: 2, w: 4, d: 4, palette: 7, roofTerrace: true },

    // summit (base 11.5)
    { pos: { x: -12, y: 11.5, z: 53 }, rotY: PI / 2, floors: 2, w: 5, d: 4.5, palette: 1, roofTerrace: true },
    { pos: { x: -2, y: 11.5, z: 57 }, rotY: PI, floors: 1, w: 4, d: 4, palette: 3 },
    { pos: { x: 10, y: 11.5, z: 56 }, rotY: -PI / 2, floors: 1, w: 4, d: 4, palette: 5 }, // s3: crates climb here
  ],

  stairs: [
    { pos: { x: 0, y: 0, z: 14 }, rotY: 0, steps: 20, width: 3 }, // praça → T1
    { pos: { x: -14, y: 3.5, z: 28 }, rotY: 0, steps: 23, width: 3 }, // T1 → T2
    { pos: { x: 14, y: 7.5, z: 41.5 }, rotY: 0, steps: 23, width: 3 }, // T2 → summit
  ],

  movingPlatforms: [
    // crosses the alley at rooftop height: row B roofs → row A roofs
    {
      from: { x: 5, y: 9.3, z: 31 },
      to: { x: -4.5, y: 9.3, z: 31 },
      size: { x: 1.8, y: 0.3, z: 1.8 },
      period: 3,
      pause: 0.8,
      color: '#c98c3c',
    },
  ],

  waterTowers: [{ pos: { x: 6.5, y: 11.5, z: 52.5 }, legHeight: 3, tankRadius: 1.7, tankHeight: 2.2 }],

  cables: [
    { from: { x: -14, y: 5.8, z: 2 }, to: { x: 14, y: 5.8, z: 1 }, sag: 1.2 },
    { from: { x: -15, y: 2.7, z: 8 }, to: { x: -14, y: 5.3, z: 3 }, sag: 0.3 },
    { from: { x: 15, y: 2.7, z: 7.5 }, to: { x: 14, y: 5.3, z: 12 }, sag: 0.3 },
    { from: { x: -8, y: 8.8, z: 23 }, to: { x: 8, y: 6.2, z: 22.5 }, sag: 0.6 },
    { from: { x: -8.5, y: 6.3, z: 28.5 }, to: { x: 8.5, y: 8.8, z: 27 }, sag: 0.5 },
    { from: { x: -8, y: 8.9, z: 33 }, to: { x: 8, y: 8.9, z: 32 }, sag: 0.5 },
    { from: { x: -14, y: 12.8, z: 38 }, to: { x: -3, y: 12.8, z: 45 }, sag: 0.7 },
    { from: { x: 6, y: 12.8, z: 44 }, to: { x: 16, y: 10.2, z: 38 }, sag: 0.6 },
    { from: { x: -12, y: 16.8, z: 53 }, to: { x: 6.5, y: 16.6, z: 52.5 }, sag: 0.8 },
    { from: { x: 10, y: 14.2, z: 56 }, to: { x: -2, y: 14.2, z: 57 }, sag: 0.5 },
  ],

  laundry: [
    { from: { x: -15, y: 2.2, z: 9.5 }, to: { x: -14, y: 2.2, z: 12 } },
    { from: { x: 14.5, y: 2.4, z: 3.5 }, to: { x: 15, y: 2.4, z: 5.5 } },
    { from: { x: 7, y: 9.6, z: 26 }, to: { x: 10, y: 9.6, z: 28 } },
    { from: { x: -7.5, y: 7.1, z: 27 }, to: { x: -9.5, y: 7.1, z: 30 } },
  ],

  notas: [
    // praça trail
    { x: 0, y: 0.6, z: 4 },
    { x: 0, y: 0.6, z: 7 },
    { x: 0, y: 0.6, z: 10 },
    { x: 1.5, y: 0.6, z: 13 },
    { x: 19, y: 0.6, z: 5 }, // hidden pocket east
    // first stairs
    { x: 0, y: 1.9, z: 16 },
    { x: 0, y: 3.0, z: 18 },
    { x: 0, y: 4.2, z: 19.5 },
    // alley
    { x: 0, y: 4.1, z: 22 },
    { x: -2, y: 4.1, z: 25 },
    { x: 2, y: 4.1, z: 29 },
    { x: 0, y: 4.1, z: 33 },
    // crate climb + rooftop route
    { x: 4.8, y: 5.0, z: 21 },
    { x: 8, y: 6.8, z: 22.5 },
    { x: 7, y: 7.9, z: 25 },
    { x: 8.5, y: 9.5, z: 27 },
    { x: 8, y: 9.5, z: 32 },
    // moving platform path
    { x: 2, y: 10.1, z: 31 },
    { x: -2, y: 10.1, z: 31 },
    { x: -8, y: 9.6, z: 33 },
    { x: -8.5, y: 7.0, z: 30 }, // a2 terrace, near bone #2
    // T2
    { x: -4, y: 8.1, z: 37 },
    { x: 0, y: 8.1, z: 40 },
    { x: 4, y: 8.1, z: 43 },
    { x: 14, y: 9.3, z: 43.5 },
    { x: 14, y: 10.7, z: 46.5 },
    // summit
    { x: 0, y: 12.1, z: 50 },
    { x: 4, y: 12.1, z: 55 },
    { x: -4, y: 12.1, z: 56 },
    { x: 12.5, y: 13.4, z: 54 },
    { x: 10, y: 14.8, z: 56 },
  ],

  bones: [
    { x: 19, y: 0.8, z: 10 }, // behind the praça houses, east pocket
    { x: -8.5, y: 6.9, z: 28.5 }, // a2 terrace roof, seen from the rooftop route
    { x: 20, y: 10.0, z: 47.5 }, // hidden flank ledge
    { x: 6.5, y: 17.3, z: 52.5 }, // water tower top — the apex
  ],

  pigeons: [
    { x: 3, y: 0, z: 5 },
    { x: -3, y: 0, z: 8 },
    { x: 0, y: 0, z: 12 },
    { x: 0, y: 3.5, z: 26 },
    { x: 1, y: 3.5, z: 31 },
    { x: -2, y: 7.5, z: 42 },
    { x: 2, y: 11.5, z: 53 },
  ],

  checkpoints: [
    { pos: { x: 0, y: 5, z: 21 }, size: { x: 6, y: 3, z: 2 } }, // top of first stairs
    { pos: { x: 0, y: 9, z: 36 }, size: { x: 28, y: 3, z: 2 } }, // entering T2
    { pos: { x: 14, y: 13, z: 48.5 }, size: { x: 6, y: 3, z: 2 } }, // summit
  ],
};
