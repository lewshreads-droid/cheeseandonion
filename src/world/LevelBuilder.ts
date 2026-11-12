import Phaser from 'phaser';
import { LEVEL_ROWS, TILE } from '../config';
import { rng } from '../gfx/PixelCanvas';
import { SectionDef } from './LevelData';
import { SOLID_TILES, T, Theme } from './tiles';

export type ContentKind = 'onion' | 'power' | 'crisp' | 'life' | 'multi';
export interface BlockContent { kind: ContentKind; count: number }

export interface Spawn { kind: string; x: number; y: number }

export interface BuiltLevel {
  map: Phaser.Tilemaps.Tilemap;
  layer: Phaser.Tilemaps.TilemapLayer;
  widthPx: number;
  heightPx: number;
  contents: Map<string, BlockContent>;   // contents of visible blocks, key "tx,ty"
  hidden: Map<string, BlockContent>;     // invisible blocks, key "tx,ty"
  saltTiles: Phaser.Tilemaps.Tile[];
  lavaTops: Phaser.Tilemaps.Tile[];
  entrances: { x: number; y: number }[]; // tile coords of the LEFT half of an enterable grater top
  spawns: Spawn[];                       // enemies, bottom-centre pixel coords, sorted by x
  onions: { x: number; y: number }[];    // pixel centres
  platforms: { x: number; y: number; w: number; vertical: boolean }[];
  firebars: { x: number; y: number; dir: number }[];
  pole: { x: number; baseY: number; topY: number } | null;
  hut: { x: number; y: number } | null;  // bottom-left
  lever: { x: number; y: number } | null; // bottom-centre
  bridge: Phaser.Tilemaps.Tile[];
  start: { x: number; y: number } | null; // tile coords
}

/** Legend — the same table is documented at the top of every level file. */
const CONTENT_CHARS: Record<string, [number, ContentKind, boolean]> = {
  '?': [T.SALT0, 'onion', false],
  M: [T.SALT0, 'power', false],
  '*': [T.SALT0, 'crisp', false],
  U: [T.SALT0, 'life', false],
  $: [T.BRICK, 'multi', false],
  h: [-1, 'onion', true],
  u: [-1, 'life', true],
};
const ENEMY_CHARS = new Set(['g', 'k', 'j', 'f', 'W']);
const isGround = (c: string) => c === '#';
const isGrater = (c: string) => c === 'G' || c === 'E';

export function buildLevel(scene: Phaser.Scene, sec: SectionDef): BuiltLevel {
  const W = sec.width, H = LEVEL_ROWS;
  const rows = sec.rows;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? '.' : rows[y][x]);
  const data: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(-1));

  const out: Omit<BuiltLevel, 'map' | 'layer'> = {
    widthPx: W * TILE, heightPx: H * TILE,
    contents: new Map(), hidden: new Map(), saltTiles: [], lavaTops: [], entrances: [],
    spawns: [], onions: [], platforms: [], firebars: [],
    pole: null, hut: null, lever: null, bridge: [], start: null,
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = at(x, y);
      const px = x * TILE, py = y * TILE;
      if (CONTENT_CHARS[c]) {
        const [tile, kind, hidden] = CONTENT_CHARS[c];
        const content: BlockContent = { kind, count: kind === 'multi' ? 10 : 1 };
        if (hidden) out.hidden.set(`${x},${y}`, content);
        else { data[y][x] = tile; out.contents.set(`${x},${y}`, content); }
        continue;
      }
      if (ENEMY_CHARS.has(c)) {
        out.spawns.push({ kind: c, x: px + TILE / 2, y: py + TILE });
        continue;
      }
      switch (c) {
        case '#': data[y][x] = isGround(at(x, y - 1)) ? T.GROUND : T.GROUND_TOP; break;
        case 'X': data[y][x] = T.SOLID; break;
        case 'B': data[y][x] = T.BRICK; break;
        case 'G':
        case 'E': {
          let run = 0;
          while (isGrater(at(x - 1 - run, y))) run++;
          const left = run % 2 === 0;
          const top = c === 'E' || !isGrater(at(x, y - 1));
          data[y][x] = top ? (left ? T.GRATER_TL : T.GRATER_TR) : left ? T.GRATER_L : T.GRATER_R;
          if (c === 'E' && left) out.entrances.push({ x, y });
          break;
        }
        case 'L': data[y][x] = at(x, y - 1) === 'L' ? T.LAVA : T.LAVA_TOP0; break;
        case '=': data[y][x] = T.BRIDGE; break;
        case 'T': {
          const l = at(x - 1, y) === 'T', r = at(x + 1, y) === 'T';
          data[y][x] = !l ? T.TREE_L : !r ? T.TREE_R : T.TREE_M;
          break;
        }
        case '|': data[y][x] = T.TRUNK; break;
        case '/': data[y][x] = T.CHAIN; break;
        case '-':
        case '^':
          if (at(x - 1, y) !== c) {
            let w = 1;
            while (at(x + w, y) === c) w++;
            out.platforms.push({ x: px, y: py, w, vertical: c === '^' });
          }
          break;
        case 'F':
          data[y][x] = T.USED;
          out.firebars.push({ x: px + 8, y: py + 8, dir: out.firebars.length % 2 ? -1 : 1 });
          break;
        case 'P': {
          data[y][x] = T.SOLID;
          out.pole = { x: px + 8, baseY: py, topY: 2 * TILE };
          break;
        }
        case 'H': out.hut = { x: px, y: py + TILE }; break;
        case 'A': out.lever = { x: px + 8, y: py + TILE }; break;
        case 'S': out.start = { x, y }; break;
        case 'o': out.onions.push({ x: px + 8, y: py + 8 }); break;
      }
    }
  }
  out.spawns.sort((a, b) => a.x - b.x);

  const map = scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
  const tileset = map.addTilesetImage('tiles', `tiles-${sec.theme}`, TILE, TILE, 0, 0)!;
  const layer = map.createLayer(0, tileset, 0, 0)!;
  layer.setCollision(SOLID_TILES);
  layer.setDepth(0);

  layer.forEachTile((t) => {
    if (t.index === T.SALT0) out.saltTiles.push(t);
    else if (t.index === T.LAVA_TOP0) out.lavaTops.push(t);
    else if (t.index === T.BRIDGE) out.bridge.push(t);
  });

  return { ...out, map, layer };
}

/* ------------------------------------------------------------------------- */

/** Scatter themed background decor. Deterministic per section so it never shifts between attempts. */
export function decorate(scene: Phaser.Scene, sec: SectionDef, seed: number): void {
  const r = rng(seed);
  const W = sec.width;
  const groundTop = (tx: number): number | null => {
    for (let y = 1; y < LEVEL_ROWS; y++) {
      const c = sec.rows[y]?.[tx];
      if (c === '#') return y;
      if (c && c !== '.' && c !== 'o' && !ENEMY_CHARS.has(c) && c !== 'S') return null;
    }
    return null;
  };
  const add = (key: string, x: number, y: number, depth = -10) =>
    scene.add.image(Math.round(x), Math.round(y), key).setOrigin(0.5, 1).setDepth(depth);

  const theme: Theme = sec.theme;
  if (theme === 'overworld') {
    for (let tx = 4; tx < W; tx += 18 + Math.floor(r() * 26)) {
      const gy = groundTop(tx);
      if (gy !== null) add(r() < 0.5 ? 'hill-big' : 'hill-small', tx * TILE, gy * TILE, -12);
    }
    for (let tx = 2; tx < W; tx += 7 + Math.floor(r() * 12)) {
      add(r() < 0.4 ? 'cloud-big' : 'cloud-small', tx * TILE, 40 + r() * 50);
    }
    for (let tx = 8; tx < W; tx += 10 + Math.floor(r() * 16)) {
      const gy = groundTop(tx);
      if (gy !== null) add('bush', tx * TILE, gy * TILE, -9);
    }
  } else if (theme === 'underground') {
    for (let tx = 3; tx < W; tx += 6 + Math.floor(r() * 14)) {
      const gy = groundTop(tx);
      if (gy !== null) add('crystals', tx * TILE, gy * TILE, -9).setAlpha(0.85);
    }
  } else if (theme === 'sky') {
    for (let tx = 0; tx < W; tx += 16 + Math.floor(r() * 20)) add('hill-sky', tx * TILE, 240, -13).setAlpha(0.8);
    for (let tx = 1; tx < W; tx += 4 + Math.floor(r() * 8)) {
      add(r() < 0.5 ? 'cloud-pink' : 'cloud-small', tx * TILE, 36 + r() * 170, -11);
    }
  } else {
    for (let tx = 4; tx < W; tx += 9 + Math.floor(r() * 6)) add('castle-window', tx * TILE, 124, -11);
    for (let tx = 9; tx < W; tx += 14 + Math.floor(r() * 8)) add('banner', tx * TILE, 80, -10);
  }
}
