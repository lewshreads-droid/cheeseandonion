import Phaser from 'phaser';
import { PixelCanvas, rng } from './PixelCanvas';

// 5x7 pixel font, drawn into 6x8 cells with a 1px black drop shadow baked in.
const GLYPHS: Record<string, string> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'].join(''),
  B: '####.#...##...#####.#...##...#####.',
  C: '.###.#...##....#....#....#...#.###.',
  D: '####.#...##...##...##...##...#####.',
  E: '######....#....####.#....#....#####',
  F: '######....#....####.#....#....#....',
  G: '.###.#...##....#.####...##...#.####',
  H: '#...##...##...#######...##...##...#',
  I: '.###...#....#....#....#....#...###.',
  J: '..###...#....#....#....#.#..#..##..',
  K: '#...##..#.#.#..##...#.#..#..#.#...#',
  L: '#....#....#....#....#....#....#####',
  M: '#...###.###.#.##.#.##...##...##...#',
  N: '#...##...###..##.#.##..###...##...#',
  O: '.###.#...##...##...##...##...#.###.',
  P: '####.#...##...#####.#....#....#....',
  Q: '.###.#...##...##...##.#.##..#..##.#',
  R: '####.#...##...#####.#.#..#..#.#...#',
  S: '.#####....#.....###.....#....#####.',
  T: '#####..#....#....#....#....#....#..',
  U: '#...##...##...##...##...##...#.###.',
  V: '#...##...##...##...##...#.#.#...#..',
  W: '#...##...##...##.#.##.#.##.#.#.#.#.',
  X: '#...##...#.#.#...#...#.#.#...##...#',
  Y: '#...##...#.#.#...#....#....#....#..',
  Z: '#####....#...#...#...#...#....#####',
  '0': '.###.#...##..###.#.###..##...#.###.',
  '1': '..#...##....#....#....#....#...###.',
  '2': '.###.#...#....#...#...#...#...#####',
  '3': '####.....#....#.###.....#....#####.',
  '4': '...#...##..#.#.#..#.#####...#....#.',
  '5': '######....####.....#....##...#.###.',
  '6': '..##..#...#....####.#...##...#.###.',
  '7': '#####....#...#...#...#....#....#...',
  '8': '.###.#...##...#.###.#...##...#.###.',
  '9': '.###.#...##...#.####....#...#..##..',
  '!': '..#....#....#....#....#.........#..',
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'].join(''),
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'].join(''),
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'].join(''),
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'].join(''),
  "'": '..#....#...#.......................',
  '&': '.##..#..#.#.#...#...#.#.##..#..##.#',
  '?': '.###.#...#....#...#...#.........#..',
  '/': '....#....#...#...#...#...#....#....',
  x: '..........#...#.#.#...#...#.#.#...#',
  '(': '...#...#...#....#....#.....#.....#.',
  ')': '.#.....#.....#....#....#...#...#...',
  '=': '..........#####.....#####..........',
  '+': '.......#....#..#####..#....#.......',
  '>': '.#.....#.....#.....#...#...#...#...',
  '<': '...#...#...#...#.....#.....#.....#.',
  '*': '.......#..#.#.#.###.#.#.#..#.......',
};

export const FONT_CHARS = ' ' + Object.keys(GLYPHS).join('');
const CELL_W = 6, CELL_H = 8;

function glyphRows(ch: string): string[] {
  const g = (GLYPHS[ch] ?? '').padEnd(35, '.');
  return Array.from({ length: 7 }, (_, i) => g.slice(i * 5, i * 5 + 5));
}

export function makeFont(scene: Phaser.Scene): void {
  const chars = FONT_CHARS;
  const perRow = 16;
  const rows = Math.ceil(chars.length / perRow);
  const pc = new PixelCanvas(scene, 'font-img', perRow * CELL_W, rows * CELL_H);
  [...chars].forEach((ch, i) => {
    const ox = (i % perRow) * CELL_W, oy = Math.floor(i / perRow) * CELL_H;
    const g = glyphRows(ch);
    for (const [dx, dy, col] of [[1, 1, '#000000'], [0, 0, '#ffffff']] as [number, number, string][])
      g.forEach((row, y) => [...row].forEach((c, x) => c === '#' && pc.px(ox + x + dx, oy + y + dy, col)));
  });
  pc.refresh();
  const data = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: 'font-img',
    width: CELL_W,
    height: CELL_H,
    chars,
    charsPerRow: perRow,
    'offset.x': 0,
    'offset.y': 0,
    'spacing.x': 0,
    'spacing.y': 0,
    lineSpacing: 2,
  });
  scene.cache.bitmapFont.add('font', data);
}

/** Chunky "CHEESE & ONION" logo: glyphs scaled 4x, outlined, with Swiss-cheese holes in CHEESE. */
export function makeLogo(scene: Phaser.Scene): void {
  const S = 4, gap = 4;
  const lines: [string, string, string, string][] = [
    ['CHEESE', '#fff08a', '#ffc828', '#d08a10'],
    ['& ONION', '#f0b0e8', '#b050a8', '#7a2a78'],
  ];
  const lineW = (t: string) => t.length * (5 * S + gap) - gap;
  const W = Math.max(...lines.map(([t]) => lineW(t))) + 8;
  const H = 2 * (7 * S) + 14 + 8;
  const pc = new PixelCanvas(scene, 'logo', W, H);
  const r = rng(42);
  lines.forEach(([text, light, mid, dark], li) => {
    const x0 = Math.floor((W - lineW(text)) / 2), y0 = 4 + li * (7 * S + 14);
    const lit: [number, number][] = [];
    [...text].forEach((ch, ci) => {
      glyphRows(ch).forEach((row, gy) =>
        [...row].forEach((c, gx) => c === '#' && lit.push([x0 + ci * (5 * S + gap) + gx * S, y0 + gy * S])),
      );
    });
    // outline + drop shadow, then fill with a vertical gradient
    for (const [x, y] of lit) pc.rect(x - 2, y - 2, S + 5, S + 5, '#2a1000');
    for (const [x, y] of lit) {
      const t = (y - y0) / (7 * S);
      pc.rect(x, y, S, S, t < 0.3 ? light : t < 0.75 ? mid : dark);
    }
    if (li === 0) {
      // Swiss cheese holes punched into the CHEESE letters
      for (let i = 0; i < 26; i++) {
        const [x, y] = lit[Math.floor(r() * lit.length)];
        pc.rect(x + 1, y + 1, 2, 2, '#b06a00');
        pc.px(x + 1, y + 1, '#7a4400');
      }
    }
  });
  pc.refresh();
}
