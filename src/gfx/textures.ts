import Phaser from 'phaser';
import { PixelCanvas, Palette, pointInPoly, rng, shade } from './PixelCanvas';
import { T, TILE_COUNT, Theme, THEMES } from '../world/tiles';
import { makeEnemyTextures } from './enemyArt';
import { makeFont, makeLogo } from './font';

/* ------------------------------------------------------------------------- */
/* Theme colours                                                              */
/* ------------------------------------------------------------------------- */

interface ThemeCols {
  bg: string;
  top: string; topDark: string; topLight: string;
  fill: string; fillDark: string; fillLight: string;
  brick: string; brickDark: string; brickLight: string; mortar: string;
  solid: string; solidDark: string; solidLight: string;
  style: 'grass' | 'rock' | 'stone';
}

export const THEME_COLS: Record<Theme, ThemeCols> = {
  overworld: {
    bg: '#6cb8ff', top: '#4cc43c', topDark: '#23802a', topLight: '#a4f080',
    fill: '#c47a3a', fillDark: '#80461c', fillLight: '#e8a868',
    brick: '#c8602c', brickDark: '#7a3214', brickLight: '#f4986a', mortar: '#3c1606',
    solid: '#d29a5c', solidDark: '#7c4c20', solidLight: '#f6d2a2', style: 'grass',
  },
  underground: {
    bg: '#0b0c22', top: '#6a8ad8', topDark: '#2c3c80', topLight: '#a8c4ff',
    fill: '#3e56a8', fillDark: '#1c2860', fillLight: '#6a86d0',
    brick: '#3c64c0', brickDark: '#1a2c6a', brickLight: '#7aa0f0', mortar: '#0a1030',
    solid: '#5a74c0', solidDark: '#1e2a60', solidLight: '#a0b8f0', style: 'rock',
  },
  sky: {
    bg: '#ffd2a0', top: '#5cd04c', topDark: '#2a8a30', topLight: '#b4f890',
    fill: '#d89a58', fillDark: '#8a5a2a', fillLight: '#f4c890',
    brick: '#d8783c', brickDark: '#84401a', brickLight: '#ffb07a', mortar: '#40180a',
    solid: '#e0b070', solidDark: '#8a6030', solidLight: '#fff0c0', style: 'grass',
  },
  castle: {
    bg: '#1c0a12', top: '#8c8c98', topDark: '#3c3c48', topLight: '#c8c8d4',
    fill: '#6c6c7a', fillDark: '#32323e', fillLight: '#9a9aa8',
    brick: '#8a4040', brickDark: '#3a1414', brickLight: '#c07070', mortar: '#1a0808',
    solid: '#8a8a96', solidDark: '#3a3a46', solidLight: '#d0d0dc', style: 'stone',
  },
};

export function generateTextures(scene: Phaser.Scene): void {
  for (const th of THEMES) makeTileset(scene, th);
  makeCheese(scene);
  makeItems(scene);
  makeEnemyTextures(scene);
  makeProps(scene);
  makeDecor(scene);
  makeFont(scene);
  makeLogo(scene);
}

/* ------------------------------------------------------------------------- */
/* Tilesets                                                                   */
/* ------------------------------------------------------------------------- */

function makeTileset(scene: Phaser.Scene, theme: Theme): void {
  const c = THEME_COLS[theme];
  const pc = new PixelCanvas(scene, `tiles-${theme}`, 16 * TILE_COUNT, 16);
  const r = rng(theme.length * 977 + 13);
  const at = (i: number) => i * 16;

  // --- ground top + fill
  const speckle = (ox: number, y0: number) => {
    for (let y = y0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const v = r();
        if (v < 0.1) pc.px(ox + x, y, c.fillDark);
        else if (v < 0.15) pc.px(ox + x, y, c.fillLight);
      }
  };
  if (c.style === 'grass') {
    let ox = at(T.GROUND_TOP);
    pc.rect(ox, 0, 16, 16, c.fill);
    speckle(ox, 4);
    for (let x = 0; x < 16; x++) {
      const depth = 3 + ((x * 7) % 5 === 0 ? 2 : (x % 3 === 0 ? 1 : 0));
      pc.rect(ox + x, 0, 1, depth, c.top);
      pc.px(ox + x, depth, c.topDark);
      pc.px(ox + x, 0, c.topLight);
      if (x % 4 === 1) pc.px(ox + x, 1, c.topLight);
    }
    ox = at(T.GROUND);
    pc.rect(ox, 0, 16, 16, c.fill);
    speckle(ox, 0);
    pc.rect(ox + 3, 6, 3, 2, c.fillDark); pc.px(ox + 3, 6, c.fillLight);
    pc.rect(ox + 10, 12, 2, 2, c.fillDark); pc.px(ox + 10, 12, c.fillLight);
  } else if (c.style === 'rock') {
    for (const idx of [T.GROUND_TOP, T.GROUND]) {
      const ox = at(idx);
      pc.rect(ox, 0, 16, 16, c.fill);
      // two irregular stones per tile
      pc.rect(ox, 7, 16, 1, c.fillDark);
      pc.rect(ox + 9, 0, 1, 7, c.fillDark);
      pc.rect(ox + 4, 8, 1, 8, c.fillDark);
      pc.rect(ox, 0, 9, 1, c.fillLight); pc.rect(ox + 10, 0, 6, 1, c.fillLight);
      pc.rect(ox + 5, 8, 11, 1, c.fillLight); pc.rect(ox, 8, 4, 1, c.fillLight);
      for (let i = 0; i < 6; i++) pc.px(ox + Math.floor(r() * 16), 1 + Math.floor(r() * 14), c.fillDark);
      if (idx === T.GROUND_TOP) {
        pc.rect(ox, 0, 16, 2, c.top);
        pc.rect(ox, 0, 16, 1, c.topLight);
        pc.rect(ox, 2, 16, 1, c.topDark);
      }
    }
  } else {
    for (const idx of [T.GROUND_TOP, T.GROUND]) {
      const ox = at(idx);
      drawBricks(pc, ox, c.fill, c.fillLight, c.fillDark, c.fillDark);
      if (idx === T.GROUND_TOP) pc.rect(ox, 0, 16, 1, c.topLight);
    }
  }

  // --- brick
  drawBricks(pc, at(T.BRICK), c.brick, c.brickLight, c.brickDark, c.mortar);

  // --- salt blocks (3 sparkle frames)
  for (let f = 0; f < 3; f++) drawSalt(pc, at(T.SALT0 + f), f);

  // --- used block (dull, emptied salt block)
  {
    const ox = at(T.USED);
    pc.rect(ox, 0, 16, 16, '#4a3828');
    pc.rect(ox + 1, 1, 14, 14, '#b09878');
    pc.rect(ox + 1, 1, 14, 1, '#cdb898');
    pc.rect(ox + 1, 14, 14, 1, '#8a7258');
    for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) pc.px(ox + x, y, '#5a4430');
  }

  // --- solid block
  {
    const ox = at(T.SOLID);
    pc.rect(ox, 0, 16, 16, c.solidDark);
    pc.rect(ox, 0, 15, 15, c.solidLight);
    pc.rect(ox + 1, 1, 14, 14, c.solid);
    pc.rect(ox + 1, 14, 15, 2, c.solidDark);
    pc.rect(ox + 14, 1, 2, 15, c.solidDark);
    pc.rect(ox + 4, 4, 7, 7, shade(c.solid, -0.12));
    pc.rect(ox + 4, 4, 7, 1, c.solidLight);
    pc.rect(ox + 4, 4, 1, 7, c.solidLight);
  }

  // --- cheese graters (pipes)
  drawGrater(pc, at(T.GRATER_TL), true);
  drawGrater(pc, at(T.GRATER_L), false);

  // --- lava
  for (let f = 0; f < 2; f++) {
    const ox = at(T.LAVA_TOP0 + f);
    for (let x = 0; x < 16; x++) {
      const s = 3 + Math.round(1.5 * Math.sin(((x + f * 4) / 8) * Math.PI * 2));
      pc.px(ox + x, s, '#ffe868');
      pc.px(ox + x, s + 1, '#ffa020');
      pc.rect(ox + x, s + 2, 1, 16 - s - 2, '#e83c10');
    }
    const lr = rng(40 + f);
    for (let i = 0; i < 6; i++) pc.px(ox + Math.floor(lr() * 16), 8 + Math.floor(lr() * 8), '#ff8030');
  }
  {
    const ox = at(T.LAVA);
    pc.rect(ox, 0, 16, 16, '#d42c0c');
    const lr = rng(77);
    for (let i = 0; i < 10; i++) pc.rect(ox + Math.floor(lr() * 15), Math.floor(lr() * 15), 2, 1, '#ff6020');
    for (let i = 0; i < 8; i++) pc.px(ox + Math.floor(lr() * 16), Math.floor(lr() * 16), '#8a1404');
  }

  // --- bridge (boss)
  {
    const ox = at(T.BRIDGE);
    pc.rect(ox, 0, 16, 6, '#a8642c');
    pc.rect(ox, 0, 16, 1, '#e0a060');
    pc.rect(ox, 5, 16, 1, '#4a2408');
    for (let x = 3; x < 16; x += 4) pc.rect(ox + x, 1, 1, 4, '#5a3010');
    for (let x = 1; x < 16; x += 3) pc.px(ox + x, 7, '#c8a070');
  }

  // --- treetops
  const leaf = '#3cba4a', leafD = '#1c7a2c', leafL = '#9af08a', leafO = '#0e4a18';
  for (const [idx, kind] of [[T.TREE_L, 'L'], [T.TREE_M, 'M'], [T.TREE_R, 'R']] as [number, string][]) {
    const ox = at(idx);
    const lr = rng(idx * 31);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        // rounded ends
        const ex = kind === 'L' ? x : kind === 'R' ? 15 - x : 99;
        const ey = Math.min(y, 15 - y);
        if (ex < 3 && ey < 3 && ex + ey < 3) continue;
        let col = leaf;
        const v = lr();
        if (v < 0.14) col = leafD;
        else if (v < 0.2) col = leafL;
        if (y === 1 || (ex < 99 && ex === 1)) col = leafL;
        if (y >= 13) col = leafD;
        const edge = y === 0 || y === 15 || ex === 0 || (ex < 3 && ey < 3 && ex + ey === 3);
        pc.px(ox + x, y, edge ? leafO : col);
      }
  }
  {
    const ox = at(T.TRUNK);
    pc.rect(ox + 5, 0, 6, 16, '#8a5a2c');
    pc.rect(ox + 6, 0, 1, 16, '#b07a40');
    pc.rect(ox + 10, 0, 1, 16, '#5a3418');
    pc.rect(ox + 8, 3, 1, 3, '#5a3418');
    pc.rect(ox + 7, 10, 1, 4, '#5a3418');
  }

  // --- chain (castle decor)
  {
    const ox = at(T.CHAIN);
    for (let i = 0; i < 4; i++) {
      const x = ox + 1 + i * 4, y = 12 - i * 4;
      pc.rect(x, y, 4, 3, '#2a2a30');
      pc.px(x + 1, y + 1, '#9a9aa8');
      pc.px(x + 2, y + 1, '#9a9aa8');
    }
  }

  for (let i = 0; i < TILE_COUNT; i++) pc.frame(i, i * 16, 0, 16, 16);
  pc.refresh();

  // debris for brick breaks
  const d = new PixelCanvas(scene, `debris-${theme}`, 8, 8);
  d.rect(0, 0, 8, 8, c.brick);
  d.rect(0, 0, 8, 1, c.brickLight);
  d.rect(0, 0, 1, 8, c.brickLight);
  d.rect(0, 4, 8, 1, c.mortar);
  d.rect(4, 0, 1, 4, c.mortar);
  d.rect(7, 0, 1, 8, c.brickDark);
  d.refresh();
}

function drawBricks(pc: PixelCanvas, ox: number, base: string, light: string, dark: string, mortar: string): void {
  pc.rect(ox, 0, 16, 16, mortar);
  const rows: [number, number][][] = [
    [[0, 7], [8, 7]],
    [[-4, 7], [4, 7], [12, 7]],
  ];
  rows.forEach((bricks, ri) => {
    const y0 = ri * 8;
    for (const [bx, bw] of bricks) {
      const x0 = Math.max(bx, 0);
      const x1 = Math.min(bx + bw, 16);
      if (x1 <= x0) continue;
      pc.rect(ox + x0, y0, x1 - x0, 7, base);
      pc.rect(ox + x0, y0, x1 - x0, 1, light);
      if (bx >= 0) pc.rect(ox + x0, y0, 1, 7, light);
      pc.rect(ox + x0, y0 + 6, x1 - x0, 1, dark);
    }
  });
}

function drawSalt(pc: PixelCanvas, ox: number, f: number): void {
  const outline = '#5a68a0';
  pc.rect(ox, 1, 16, 14, outline);
  pc.rect(ox + 1, 0, 14, 16, outline);
  pc.rect(ox + 1, 1, 14, 14, '#f4f7ff');
  pc.rect(ox + 1, 1, 14, 1, '#ffffff');
  pc.rect(ox + 1, 1, 1, 14, '#ffffff');
  pc.rect(ox + 1, 14, 14, 1, '#b8c4e4');
  pc.rect(ox + 14, 1, 1, 14, '#b8c4e4');
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) pc.px(ox + x, y, '#c0cce8');
  // isometric salt crystal in the middle
  pc.poly([[8, 3], [12.5, 5.2], [8, 7.5], [3.5, 5.2]], '#ffffff', ox);
  pc.poly([[3.5, 5.2], [8, 7.5], [8, 12.5], [3.5, 10.2]], '#d4ddf6', ox);
  pc.poly([[8, 7.5], [12.5, 5.2], [12.5, 10.2], [8, 12.5]], '#9aa8d8', ox);
  const e = '#6a78b0';
  pc.line(ox + 8, 3, ox + 12, 5, e); pc.line(ox + 8, 3, ox + 4, 5, e);
  pc.line(ox + 4, 5, ox + 4, 10, e); pc.line(ox + 12, 5, ox + 12, 10, e);
  pc.line(ox + 4, 10, ox + 8, 12, e); pc.line(ox + 12, 10, ox + 8, 12, e);
  pc.line(ox + 8, 7, ox + 8, 12, e);
  pc.line(ox + 4, 5, ox + 8, 7, e); pc.line(ox + 12, 5, ox + 8, 7, e);
  // sparkle (golden glint so it reads on white)
  const sp = '#ffcc30';
  const spots: [number, number, number][] = [[12, 3, 1], [12, 3, 2], [3, 12, 2]];
  const [sx, sy, s] = spots[f];
  pc.px(ox + sx, sy, '#fff8c0');
  for (let i = 1; i <= s; i++) {
    pc.px(ox + sx - i, sy, sp); pc.px(ox + sx + i, sy, sp);
    pc.px(ox + sx, sy - i, sp); pc.px(ox + sx, sy + i, sp);
  }
}

/** Draws a 32x16 slab of grater (lip=true for the top row) into two adjacent tiles. */
function drawGrater(pc: PixelCanvas, ox: number, lip: boolean): void {
  const o = '#262e38', w = '#ffffff', l = '#dce6ee', m = '#a8b6c4', d = '#6c7a8a', h = '#161a20';
  const colCol = (x: number) => (x <= 3 ? l : x <= 6 ? w : x <= 14 ? l : x <= 22 ? m : d);
  const body = (y0: number, y1: number) => {
    for (let x = 2; x <= 29; x++) pc.rect(ox + x, y0, 1, y1 - y0, colCol(x));
    pc.rect(ox + 1, y0, 1, y1 - y0, o);
    pc.rect(ox + 30, y0, 1, y1 - y0, o);
  };
  if (lip) {
    body(12, 16);
    pc.rect(ox, 0, 32, 12, o);
    for (let x = 1; x <= 30; x++) pc.rect(ox + x, 1, 1, 10, colCol(x));
    pc.rect(ox + 1, 1, 30, 1, w);
    pc.rect(ox + 1, 5, 30, 1, d);
    pc.rect(ox + 1, 6, 30, 1, l);
    pc.rect(ox + 1, 10, 30, 1, d);
  } else {
    body(0, 16);
    const holes: [number, number][] = [[7, 3], [14, 3], [21, 3], [10, 11], [17, 11], [24, 11]];
    for (const [hx, hy] of holes) {
      pc.rect(ox + hx, hy, 3, 2, h);
      pc.rect(ox + hx, hy + 2, 3, 1, w);
    }
  }
}

/* ------------------------------------------------------------------------- */
/* Cheese (the hero)                                                          */
/* ------------------------------------------------------------------------- */

export const CHEESE_FRAMES = [
  'idle', 'blink', 'walk0', 'walk1', 'walk2', 'walk3', 'run0', 'run1',
  'jump', 'fall', 'skid', 'crouch', 'dead', 'throw', 'pole',
] as const;
export type CheeseFrame = (typeof CHEESE_FRAMES)[number];

interface CheesePal { body: string; light: string; shade: string; hole: string; holeDark: string; outline: string; leg: string }

const CHEESE_PALS: Record<string, CheesePal> = {
  small: { body: '#ffd84a', light: '#fff4a8', shade: '#e8a820', hole: '#d0901a', holeDark: '#a86a08', outline: '#5a3200', leg: '#5a3200' },
  big: { body: '#ffa22a', light: '#ffd488', shade: '#d47610', hole: '#b05e08', holeDark: '#7e3e00', outline: '#4a2200', leg: '#4a2200' },
  fire: { body: '#ff6a48', light: '#ffb4a0', shade: '#d03a20', hole: '#a82812', holeDark: '#701000', outline: '#4a0800', leg: '#4a0800' },
  star0: { body: '#ffffff', light: '#ffffff', shade: '#ffe070', hole: '#ffc020', holeDark: '#e09000', outline: '#a05000', leg: '#a05000' },
  star1: { body: '#6ae860', light: '#c0ffb0', shade: '#30a830', hole: '#208020', holeDark: '#0a5010', outline: '#003000', leg: '#003000' },
  star2: { body: '#ff5050', light: '#ffb0b0', shade: '#c02020', hole: '#901010', holeDark: '#600000', outline: '#300000', leg: '#300000' },
  star3: { body: '#60d8ff', light: '#c8f4ff', shade: '#2090d0', hole: '#1068a0', holeDark: '#004070', outline: '#002040', leg: '#002040' },
};

export const STAR_PALS = ['star0', 'star1', 'star2', 'star3'];

/** Texture key for a given size + palette. Small has no 'fire' variant (fire implies big). */
export const cheeseKey = (big: boolean, pal: string) => `cheese-${big ? 'big' : 'small'}-${pal}`;

function makeCheese(scene: Phaser.Scene): void {
  const sets: [boolean, string][] = [
    [false, 'normal'], [true, 'normal'], [true, 'fire'],
    ...STAR_PALS.map((p) => [false, p] as [boolean, string]),
    ...STAR_PALS.map((p) => [true, p] as [boolean, string]),
  ];
  for (const [big, palName] of sets) {
    const W = big ? 24 : 16, H = big ? 32 : 16;
    const pal = CHEESE_PALS[palName === 'normal' ? (big ? 'big' : 'small') : palName];
    const pc = new PixelCanvas(scene, cheeseKey(big, palName), W * CHEESE_FRAMES.length, H);
    CHEESE_FRAMES.forEach((f, i) => {
      drawCheeseFrame(pc, i * W, big, pal, f);
      pc.frame(f, i * W, 0, W, H);
    });
    pc.refresh();
  }
}

type Look = 'fwd' | 'up' | 'down' | 'back' | 'closed' | 'x';
interface Leg { x: number; lift?: boolean; reach?: number }

const LEGS: Record<CheeseFrame, Leg[] | 'blur' | null> = {
  idle: [{ x: 4 }, { x: 10 }],
  blink: [{ x: 4 }, { x: 10 }],
  throw: [{ x: 3 }, { x: 11 }],
  walk0: [{ x: 2 }, { x: 11 }],
  walk1: [{ x: 5 }, { x: 8, lift: true }],
  walk2: [{ x: 3 }, { x: 12 }],
  walk3: [{ x: 5, lift: true }, { x: 8 }],
  run0: 'blur',
  run1: 'blur',
  jump: [{ x: 2 }, { x: 11, lift: true }],
  fall: [{ x: 3 }, { x: 11 }],
  skid: [{ x: 4 }, { x: 11, reach: 2 }],
  crouch: null,
  dead: [{ x: 1 }, { x: 13 }],
  pole: [{ x: 9, lift: true }, { x: 12, lift: true }],
};

const LOOK: Record<CheeseFrame, Look> = {
  idle: 'fwd', blink: 'closed', throw: 'fwd', walk0: 'fwd', walk1: 'fwd', walk2: 'fwd', walk3: 'fwd',
  run0: 'fwd', run1: 'fwd', jump: 'up', fall: 'down', skid: 'back', crouch: 'down', dead: 'x', pole: 'fwd',
};

function drawCheeseFrame(pc: PixelCanvas, ox: number, big: boolean, pal: CheesePal, f: CheeseFrame): void {
  const W = big ? 24 : 16, H = big ? 32 : 16;
  const bottom = big ? 29 : 14;
  const bob = f === 'walk1' || f === 'walk3' ? -1 : 0;
  const crouch = f === 'crouch';
  let pts: [number, number][];
  if (big) pts = crouch ? [[1, 23], [23, 13], [23, 32], [1, 32]] : [[1, 21], [23, 4], [23, bottom], [1, bottom]];
  else pts = crouch ? [[1, 13], [15, 7], [15, 16], [1, 16]] : [[0, 12], [15, 3], [15, bottom], [0, bottom]];
  if (f === 'throw') pts = pts.map(([x, y]) => [x, y + (x > 10 ? 1 : 0)] as [number, number]);
  pts = pts.map(([x, y]) => [x, y + bob] as [number, number]);

  // body mask
  const mask: boolean[][] = [];
  for (let y = 0; y < H; y++) {
    mask.push([]);
    for (let x = 0; x < W; x++) mask[y].push(pointInPoly(x + 0.5, y + 0.5, pts));
  }
  const m = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && mask[y][x];
  const edge = (x: number, y: number) => !m(x - 1, y) || !m(x + 1, y) || !m(x, y - 1) || !m(x, y + 1);

  // legs first (body overlaps their tops)
  const legs = LEGS[f];
  const legW = big ? 3 : 2, legH = big ? 3 : 2;
  const sx = (x: number) => (big ? Math.round(x * 1.5) : x);
  if (legs === 'blur') {
    const phase = f === 'run0' ? 0 : 1;
    for (let row = 0; row < legH; row++)
      for (let x = sx(2); x <= sx(13); x++) {
        const on = (x + row + phase) % 2 === 0;
        pc.px(ox + x, bottom + bob + row, on ? pal.leg : pal.shade);
      }
  } else if (legs) {
    for (const leg of legs) {
      const lx = sx(leg.x);
      const h = leg.lift ? legH - 1 : legH;
      pc.rect(ox + lx, bottom + bob, legW, h, pal.leg);
      pc.rect(ox + lx, bottom + bob + h - 1, legW + 1 + (leg.reach ?? 0), 1, pal.leg);
    }
  }

  // body
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!m(x, y)) continue;
      let col = pal.body;
      if (edge(x, y)) col = pal.outline;
      else if (!m(x, y - 2)) col = pal.light;
      else if (!m(x, y + 2) || !m(x + 2, y)) col = pal.shade;
      pc.px(ox + x, y, col);
    }

  // swiss holes
  const holes: [number, number, number][] = big
    ? [[5, 25, 2.2], [11, 21, 2.6], [17, 25, 2], [19, 15.5, 2], [7, 18.5, 1.4], [14, 14.5, 1.4]]
    : [[5.5, 12, 1.4], [9.5, 10.5, 1.3], [12.8, 12.2, 1.1]];
  for (const [hx, hy0, hr] of holes) {
    const hy = hy0 + bob + (crouch ? (big ? 5 : 2) : 0);
    for (let y = Math.floor(hy - hr); y <= Math.ceil(hy + hr); y++)
      for (let x = Math.floor(hx - hr); x <= Math.ceil(hx + hr); x++) {
        const dx = x + 0.5 - hx, dy = y + 0.5 - hy;
        if (dx * dx + dy * dy > hr * hr) continue;
        if (!m(x, y) || edge(x, y)) continue;
        pc.px(ox + x, y, y + 0.5 < hy ? pal.holeDark : pal.hole);
      }
  }

  // eyes
  const look = LOOK[f];
  const ew = big ? 7 : 5, eh = big ? 9 : 7;
  const ey0 = (crouch ? (big ? 10 : 4) : 0) + bob;
  const eyes: [number, number][] = big ? [[9, 1 + ey0], [15, 3 + ey0]] : [[6, 1 + ey0], [10, 2 + ey0]];
  for (const [ex, ey] of eyes) {
    pc.rect(ox + ex + 1, ey, ew - 2, eh, pal.outline);
    pc.rect(ox + ex, ey + 1, ew, eh - 2, pal.outline);
    const iw = ew - 2, ih = eh - 2, ix = ox + ex + 1, iy = ey + 1;
    pc.rect(ix, iy, iw, ih, '#ffffff');
    if (look === 'closed') {
      pc.rect(ix, iy, iw, ih, pal.light);
      pc.rect(ix, iy + Math.floor(ih / 2), iw, 1, pal.outline);
    } else if (look === 'x') {
      for (let i = 0; i < Math.min(iw, ih); i++) {
        pc.px(ix + i, iy + i, '#101010');
        pc.px(ix + iw - 1 - i, iy + i, '#101010');
      }
    } else {
      const pw = big ? 3 : 2, ph = 3;
      let px = iw - pw, py = Math.round((ih - ph) / 2);
      if (look === 'up') py = 0;
      if (look === 'down') py = ih - ph;
      if (look === 'back') px = 0;
      pc.rect(ix + px, iy + py, pw, ph, '#101010');
      if (big) pc.px(ix + px, iy + py, '#ffffff');
    }
  }
}

/* ------------------------------------------------------------------------- */
/* Items                                                                      */
/* ------------------------------------------------------------------------- */

const ONION_ART = [
  '................',
  '.......G..G.....',
  '........GG......',
  '........gg......',
  '.......kggk.....',
  '.....kkPPPPkk...',
  '....kPLWPPPPPk..',
  '...kPLWPPpPPPPk.',
  '...kPLPPPpPPPpk.',
  '...kPLPPpPPPPpk.',
  '...kPPPPpPPPPpk.',
  '....kPPPpPPPpk..',
  '.....kpPPpPPpk..',
  '......kkkkkk....',
  '.......BB.......',
  '................',
];

const ONION_PAL: Palette = {
  G: '#6ad84a', g: '#2a8a20', k: '#3a1028', P: '#9a4a8a', p: '#622a5a', L: '#d090c8', W: '#f8e0f0', B: '#b07840',
};
const LUCKY_PAL: Palette = {
  G: '#6ad84a', g: '#2a8a20', k: '#5a3a00', P: '#ffc828', p: '#d08a00', L: '#fff0a0', W: '#ffffff', B: '#b07840',
};

const CHILLI_ART = [
  '................',
  '...........gg...',
  '..........gg....',
  '......kkkgGgk...',
  '.....kRWRRgGRk..',
  '....kRWRRRRRRRk.',
  '....kRWRRRRRRrk.',
  '....kRRRRRRRRrk.',
  '.....kRRRRRRrk..',
  '.....kRRRRRRrk..',
  '......kRRRRrk...',
  '......kRRRRrk...',
  '.......kRRrk....',
  '.......kRrk.....',
  '........kk......',
  '................',
];

const PICKLED_ART = [
  '..kkkk..',
  '.kWWPPk.',
  'kWWPPPPk',
  'kWPPPPpk',
  'kPPPPPpk',
  'kPPPPppk',
  '.kPPppk.',
  '..kkkk..',
];

function makeItems(scene: Phaser.Scene): void {
  // onion (2 frames: normal, glint)
  for (const [key, pal] of [['onion', ONION_PAL], ['lucky', LUCKY_PAL]] as [string, Palette][]) {
    const pc = new PixelCanvas(scene, key, 32, 16);
    pc.art(0, 0, ONION_ART, pal);
    pc.art(16, 0, ONION_ART, { ...pal, L: '#ffffff', W: '#ffffff' });
    pc.frame(0, 0, 0, 16, 16);
    pc.frame(1, 16, 0, 16, 16);
    pc.refresh();
  }

  // HUD onion icon (8x8)
  {
    const pc = new PixelCanvas(scene, 'onion-icon', 8, 8);
    pc.art(0, 0, ['...G.G..', '....g...', '..kPPk..', '.kPLPPk.', '.kLPpPk.', '.kPPpPk.', '..kppk..', '...kk...'], ONION_PAL);
    pc.refresh();
  }

  // sparkle (4 frames, 8x8)
  {
    const pc = new PixelCanvas(scene, 'sparkle', 32, 8);
    const sizes = [1, 2, 3, 2];
    sizes.forEach((s, f) => {
      const ox = f * 8;
      for (let i = 1; i <= s; i++) {
        const c = i === s ? '#ffd040' : '#ffffff';
        pc.px(ox + 4 - i, 4, c); pc.px(ox + 4 + i - 1, 4, c);
        pc.px(ox + 4, 4 - i, c); pc.px(ox + 4, 4 + i - 1, c);
      }
      pc.px(ox + 4, 4, '#ffffff');
      if (s >= 2) { pc.px(ox + 2, 2, '#fff0a0'); pc.px(ox + 6, 6, '#fff0a0'); pc.px(ox + 6, 2, '#fff0a0'); pc.px(ox + 2, 6, '#fff0a0'); }
      pc.frame(f, ox, 0, 8, 8);
    });
    pc.refresh();
  }

  // cracker (power-up)
  {
    const pc = new PixelCanvas(scene, 'cracker', 16, 16);
    pc.rect(1, 2, 14, 13, '#6a4410');
    pc.rect(2, 1, 12, 15, '#6a4410');
    pc.rect(2, 2, 12, 13, '#f0d090');
    pc.rect(2, 2, 12, 1, '#fff4c8');
    pc.rect(2, 2, 1, 12, '#fff4c8');
    pc.rect(2, 13, 12, 2, '#c89850');
    pc.rect(13, 3, 1, 11, '#c89850');
    for (const [x, y] of [[4, 4], [8, 4], [11, 4], [6, 7], [10, 7], [4, 10], [8, 10], [11, 10]]) {
      pc.px(x, y, '#a07028');
      pc.px(x, y + 1, '#fff4c8');
    }
    // tiny friendly eyes so it reads as a power-up, not a tile
    pc.rect(5, 6, 2, 3, '#ffffff'); pc.px(6, 7, '#101010'); pc.px(6, 8, '#101010');
    pc.rect(9, 6, 2, 3, '#ffffff'); pc.px(10, 7, '#101010'); pc.px(10, 8, '#101010');
    pc.refresh();
  }

  // chilli (2 frames)
  {
    const pc = new PixelCanvas(scene, 'chilli', 32, 16);
    const pal: Palette = { k: '#3a0a00', R: '#e82a1a', r: '#a01408', W: '#ffb0a0', g: '#1e7a20', G: '#5ad04a' };
    pc.art(0, 0, CHILLI_ART, pal);
    pc.art(16, 0, CHILLI_ART, { ...pal, R: '#ff5a3a', W: '#ffffff' });
    pc.frame(0, 0, 0, 16, 16);
    pc.frame(1, 16, 0, 16, 16);
    pc.refresh();
  }

  // golden crisp (2 frames)
  {
    const pc = new PixelCanvas(scene, 'crisp', 32, 16);
    for (let f = 0; f < 2; f++) {
      const ox = f * 16;
      const base = f ? '#ffe070' : '#ffc830';
      pc.ellipse(ox + 8, 8, 7.5, 6, '#7a4a00');
      pc.ellipse(ox + 8, 8, 6.5, 5, base);
      for (let x = 3; x < 14; x += 3) pc.line(ox + x, 4, ox + x + 1, 12, '#e09a10');
      pc.rect(ox + 4, 4, 3, 1, '#fff8d0');
      pc.px(ox + 4, 5, '#fff8d0');
      pc.px(ox + 11, 10, '#ffffff');
      pc.frame(f, ox, 0, 16, 16);
    }
    pc.refresh();
  }

  // pickled onion projectile
  {
    const pc = new PixelCanvas(scene, 'pickled', 8, 8);
    pc.art(0, 0, PICKLED_ART, { k: '#6a5a3a', W: '#ffffff', P: '#ece4c8', p: '#b8a880' });
    pc.refresh();
  }

  // poof (3 frames, 16x16) — projectile impact
  {
    const pc = new PixelCanvas(scene, 'poof', 48, 16);
    [3, 5, 7].forEach((r, f) => {
      pc.disc(f * 16 + 8, 8, r, f === 2 ? '#ffffff' : '#ffe080');
      if (f === 1) pc.disc(f * 16 + 8, 8, r - 2, '#ffffff');
      if (f === 2) pc.eraseDisc(f * 16 + 8, 8, r - 2);
      pc.frame(f, f * 16, 0, 16, 16);
    });
    pc.refresh();
  }

  // dust puffs (skid / landing)
  {
    const pc = new PixelCanvas(scene, 'dust', 24, 8);
    [1.5, 2.5, 3.2].forEach((r, f) => {
      pc.disc(f * 8 + 4, 4, r, '#e8e8e8');
      pc.px(f * 8 + 3, 3, '#ffffff');
      pc.frame(f, f * 8, 0, 8, 8);
    });
    pc.refresh();
  }

  // firebar orb (2 frames)
  {
    const pc = new PixelCanvas(scene, 'orb', 16, 8);
    for (let f = 0; f < 2; f++) {
      pc.disc(f * 8 + 4, 4, 3.6, f ? '#ff7a10' : '#e83a10');
      pc.disc(f * 8 + 4, 4, 2.4, f ? '#ffd040' : '#ffa020');
      pc.disc(f * 8 + 4, 4, 1.2, '#fff8c0');
      pc.frame(f, f * 8, 0, 8, 8);
    }
    pc.refresh();
  }
}

/* ------------------------------------------------------------------------- */
/* Props: platform, breadstick flagpole, crisp-packet flag, hamper hut, lever */
/* ------------------------------------------------------------------------- */

function makeProps(scene: Phaser.Scene): void {
  // moving platform segment — a crispbread plank
  {
    const pc = new PixelCanvas(scene, 'platform', 16, 8);
    pc.rect(0, 0, 16, 8, '#6a4214');
    pc.rect(0, 1, 16, 6, '#e8c078');
    pc.rect(0, 1, 16, 1, '#fff0c0');
    pc.rect(0, 6, 16, 1, '#b88a40');
    for (const [x, y] of [[2, 3], [6, 4], [10, 3], [14, 4]]) pc.px(x, y, '#a07030');
    pc.refresh();
  }

  // breadstick shaft (repeats vertically) and tip
  {
    const pc = new PixelCanvas(scene, 'breadstick', 8, 16);
    pc.rect(2, 0, 4, 16, '#e8c88a');
    pc.rect(2, 0, 1, 16, '#fff0c8');
    pc.rect(5, 0, 1, 16, '#b08848');
    for (const [x, y] of [[3, 2], [4, 6], [3, 10], [4, 13]]) pc.px(x, y, '#c8a060');
    pc.px(4, 3, '#ffffff'); pc.px(3, 9, '#ffffff');
    pc.refresh();
    const tip = new PixelCanvas(scene, 'breadstick-tip', 8, 8);
    tip.ellipse(4, 4, 3.5, 3.5, '#8a5a20');
    tip.ellipse(4, 4, 2.6, 2.6, '#e8c88a');
    tip.px(3, 3, '#fff0c8');
    tip.refresh();
  }

  // cheese & onion crisp-packet flag
  {
    const pc = new PixelCanvas(scene, 'flag', 16, 16);
    pc.rect(1, 1, 14, 14, '#1a3a8a');
    pc.rect(2, 2, 12, 12, '#2a6ad8');
    for (let x = 1; x < 15; x += 2) { pc.px(x, 0, '#c8d8ff'); pc.px(x + 1, 15, '#c8d8ff'); }
    pc.rect(1, 1, 14, 1, '#c8d8ff');
    pc.rect(1, 14, 14, 1, '#c8d8ff');
    // tiny wedge + onion logo
    pc.poly([[3, 9], [9, 5], [9, 11], [3, 11]], '#ffd84a');
    pc.px(5, 9, '#d0901a'); pc.px(7, 8, '#d0901a');
    pc.disc(11.5, 9.5, 2, '#9a4a8a');
    pc.px(11, 6, '#6ad84a');
    pc.rect(3, 3, 9, 1, '#ffffff');
    pc.refresh();
  }

  // picnic-hamper hut (80x80)
  {
    const pc = new PixelCanvas(scene, 'hut', 80, 80);
    // wicker body
    pc.rect(4, 34, 72, 46, '#5a3410');
    for (let y = 36; y < 80; y += 4)
      for (let x = 6; x < 74; x += 4) {
        const alt = ((x + y) / 4) % 2 === 0;
        pc.rect(x, y, 4, 4, alt ? '#d8a050' : '#a87030');
        pc.px(x, y, alt ? '#f8d090' : '#c08840');
      }
    // lid (gingham cloth)
    pc.poly([[0, 34], [10, 18], [70, 18], [80, 34]], '#7a1010');
    pc.poly([[2, 33], [11, 19], [69, 19], [78, 33]], '#ffffff', 0, 0, (x, y) => !((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0));
    pc.poly([[2, 33], [11, 19], [69, 19], [78, 33]], '#e83030', 0, 0, (x, y) => (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0);
    pc.rect(0, 33, 80, 2, '#7a1010');
    // handle
    for (let a = 0; a <= Math.PI; a += 0.02) {
      const x = 40 + Math.cos(a) * 18, y = 18 - Math.sin(a) * 14;
      pc.rect(x - 1, y - 1, 3, 3, '#5a3410');
      pc.px(x, y, '#c08840');
    }
    // door
    pc.rect(30, 52, 20, 28, '#2a1404');
    pc.ellipse(40, 53, 10, 6, '#2a1404');
    pc.rect(32, 54, 16, 26, '#0e0602');
    pc.ellipse(40, 55, 8, 5, '#0e0602');
    pc.refresh();
  }

  // lever (2 frames: up, pulled)
  {
    const pc = new PixelCanvas(scene, 'lever', 32, 32);
    for (let f = 0; f < 2; f++) {
      const ox = f * 16;
      const tx = f ? ox + 3 : ox + 12, ty = f ? 26 : 4;
      pc.line(ox + 8, 26, tx, ty, '#3a3a44');
      pc.line(ox + 9, 26, tx + 1, ty, '#9a9aa8');
      pc.disc(tx + 0.5, ty + 0.5, 2.8, '#7a0a0a');
      pc.disc(tx + 0.5, ty + 0.5, 2, '#e82a2a');
      pc.px(tx - 1, ty - 1, '#ffb0b0');
      pc.rect(ox + 2, 26, 12, 6, '#2a2a30');
      pc.rect(ox + 3, 27, 10, 4, '#6a6a78');
      pc.rect(ox + 3, 27, 10, 1, '#a8a8b8');
      pc.frame(f, ox, 0, 16, 32);
    }
    pc.refresh();
  }

  // 1x1 white pixel for overlays
  const px = new PixelCanvas(scene, 'pixel', 1, 1);
  px.px(0, 0, '#ffffff');
  px.refresh();
}

/* ------------------------------------------------------------------------- */
/* Background decor                                                           */
/* ------------------------------------------------------------------------- */

function makeDecor(scene: Phaser.Scene): void {
  // patchwork hills (a nod to Gower fields)
  const hill = (key: string, w: number, h: number, base: string, seed: number) => {
    const pc = new PixelCanvas(scene, key, w, h);
    const r = rng(seed);
    const cols = [base, shade(base, 0.15), shade(base, -0.1), shade(base, 0.28)];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - w / 2) / (w / 2), dy = (h - y - 0.5) / h;
        if (dx * dx + dy * dy > 1) continue;
        const band = Math.floor((x + y * 0.6) / 14) + Math.floor(y / 10);
        pc.px(x, y, cols[Math.abs(band) % cols.length]);
      }
    // hedgerows
    for (let i = 0; i < w / 10; i++) {
      const x = Math.floor(r() * w);
      for (let y = 0; y < h; y++) {
        const dx = (x + 0.5 - w / 2) / (w / 2), dy = (h - y - 0.5) / h;
        if (dx * dx + dy * dy <= 1 && y % 2 === 0) pc.px(x, y, shade(base, -0.35));
      }
    }
    // outline
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const inside = (xx: number, yy: number) => {
          const dx = (xx + 0.5 - w / 2) / (w / 2), dy = (h - yy - 0.5) / h;
          return dx * dx + dy * dy <= 1;
        };
        if (inside(x, y) && (!inside(x, y - 1) || !inside(x - 1, y) || !inside(x + 1, y))) pc.px(x, y, shade(base, -0.45));
      }
    pc.refresh();
  };
  hill('hill-big', 112, 48, '#7ad04e', 3);
  hill('hill-small', 64, 28, '#68c04a', 5);
  hill('hill-sky', 96, 40, '#9ad8a0', 9);

  const cloud = (key: string, w: number, h: number, puffs: [number, number, number][], tint = '#ffffff', shadeCol = '#d4ecff') => {
    const pc = new PixelCanvas(scene, key, w, h);
    for (const [x, y, r] of puffs) pc.disc(x, y + 1, r, shadeCol);
    for (const [x, y, r] of puffs) pc.disc(x, y, r - 0.6, tint);
    pc.refresh();
  };
  cloud('cloud-small', 32, 18, [[9, 11, 6], [17, 8, 7.5], [24, 11, 6]]);
  cloud('cloud-big', 56, 22, [[9, 14, 7], [20, 9, 9], [33, 10, 9.5], [45, 14, 7.5]]);
  cloud('cloud-pink', 56, 22, [[9, 14, 7], [20, 9, 9], [33, 10, 9.5], [45, 14, 7.5]], '#fff4f0', '#f8c0b0');

  // bush
  {
    const pc = new PixelCanvas(scene, 'bush', 40, 14);
    for (const [x, y, r] of [[8, 9, 6], [18, 7, 8], [29, 8, 7], [35, 10, 5]] as [number, number, number][]) {
      pc.disc(x, y, r, '#1c6a24');
      pc.disc(x - 1, y - 0.5, r - 1.3, '#38a83c');
      pc.px(x - 3, y - 3, '#8ae07a');
    }
    pc.rect(0, 13, 40, 1, '#1c6a24');
    pc.refresh();
  }

  // underground salt crystals
  {
    const pc = new PixelCanvas(scene, 'crystals', 24, 20);
    const shard = (x: number, w: number, h: number, c: string) => {
      pc.poly([[x, 20], [x + w / 2, 20 - h], [x + w, 20]], shade(c, -0.4));
      pc.poly([[x + 1, 20], [x + w / 2, 21 - h], [x + w - 1, 20]], c);
      pc.line(x + w / 2, 22 - h, x + w / 2, 19, shade(c, 0.5));
    };
    shard(2, 6, 12, '#7aa8e8');
    shard(8, 8, 19, '#a8d0ff');
    shard(15, 7, 10, '#7aa8e8');
    pc.refresh();
  }

  // castle decor: barred window with lava glow and a hanging banner
  {
    const pc = new PixelCanvas(scene, 'castle-window', 16, 24);
    pc.rect(0, 4, 16, 20, '#0a0206');
    pc.ellipse(8, 5, 8, 5, '#0a0206');
    pc.rect(2, 6, 12, 18, '#5a1808');
    pc.ellipse(8, 7, 6, 4, '#5a1808');
    pc.rect(2, 16, 12, 8, '#a83010');
    for (let x = 4; x < 14; x += 3) pc.rect(x, 4, 1, 20, '#2a2a30');
    pc.refresh();
    const ban = new PixelCanvas(scene, 'banner', 16, 32);
    ban.rect(1, 0, 14, 1, '#ffc020');
    ban.poly([[2, 1], [14, 1], [14, 30], [8, 25], [2, 30]], '#5a1a8a');
    ban.poly([[3, 2], [13, 2], [13, 27], [8, 23], [3, 27]], '#7a2aa8');
    // stylised sunglasses emblem
    ban.rect(4, 9, 8, 1, '#101010');
    ban.rect(4, 10, 3, 2, '#101010');
    ban.rect(9, 10, 3, 2, '#101010');
    ban.px(5, 10, '#6ab0ff'); ban.px(10, 10, '#6ab0ff');
    ban.refresh();
  }
}
