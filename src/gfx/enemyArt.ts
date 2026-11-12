import Phaser from 'phaser';
import { PixelCanvas, Palette, mirror } from './PixelCanvas';

// Reptilian agents: green scales, slit-pupil eyes peering over sunglasses, black suits, red ties.
// Art is drawn facing right; sprites flip for left.

const PAL: Palette = {
  k: '#101018', // outline / lenses
  s: '#2e2e3e', // suit
  S: '#50506a', // suit highlight
  G: '#4cb83c', // scales
  g: '#2c7a24', // dark scales
  l: '#9ae67a', // light scales
  Y: '#ffe23a', // eye
  w: '#ffffff',
  r: '#e02828', // tie
  b: '#6ab0ff', // lens glint
  H: '#b4bccc', // armour light
  h: '#7a8498', // armour
  j: '#4a5268', // armour dark
  P: '#8a32b8', // cape
  p: '#4e1676', // cape dark
  O: '#ffc020', // gold
  R: '#d82020', // ruby / mouth
};

const GRUNT_TOP = [
  '................',
  '.....kkkkkk.....',
  '...kkGGGGGGkk...',
  '..kGlGGGGGGGGk..',
  '..kGYkYGGYkYGk..',
  '.kkkkkkGGkkkkkk.',
  '..kbkkkGGkbkkk..',
  '..kGGGGGGGGGGk..',
  '...kGkkkkkkGk...',
  '....kkwrrwkk....',
  '...ksswrrwssk...',
  '..GksssrrssskG..',
  '...kssssssssk...',
  '...kkkkkkkkkk...',
];
const GRUNT_A = [...GRUNT_TOP, '....kss..ssk....', '...kkkk..kkkk...'];
const GRUNT_B = [...GRUNT_TOP, '...kss....ssk...', '..kkkk....kkkk..'];
const GRUNT_FLAT = [
  '................', '................', '................', '................', '................',
  '................', '................', '................', '................', '................',
  '....kkkkkkkk....',
  '..kGYkYGGYkYGk..',
  '.kkkkkkGGkkkkkk.',
  '.ksswwrrwwsssk..',
  '.kssssssssssssk.',
  '..kkkk....kkkk..',
];

const SHELLBACK_TOP = [
  '......kkkkk.....',
  '.....kGGGGGk....',
  '.....kGlGGGGk...',
  '.....kGGYkGGGk..',
  '.....kkkkkkGGGk.',
  '......kGGGGGGGk.',
  '.......kkkGGkk..',
  '..kkkkk.kwrk....',
  '.kHHHHhkkwrk....',
  'kHHhhhhjkssk....',
  'kHhhHhhjkssGk...',
  'khhhhhhjkssGk...',
  'khhHhhhjksssk...',
  'kjhhhhjjkssk....',
  '.kjjjjjkkssk....',
  '..kkkkkkksssk...',
  '........kssk....',
  '.......kssssk...',
  '.......kskksk...',
];
const SHELLBACK_A = [...SHELLBACK_TOP, '.......ks..sk...', '.......ks..sk...', '......kks..skk..', '......kkk..kkk..'];
const SHELLBACK_B = [...SHELLBACK_TOP, '......ks...sk...', '.....ks.....sk..', '....kks.....skk.', '....kkk.....kkk.'];

const SHELL_A = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....kkkkkk.....',
  '...kkHHHHhhkk...',
  '..kHHHhhhhhhjk..',
  '.kHHhhHhhhHhhjk.',
  '.kHhhhhhhhhhhjk.',
  'kHhhHhhhhHhhhhjk',
  'khhhhhhhhhhhhhjk',
  'kjhhhhhhhhhhhjjk',
  'kkkkkkkkkkkkkkkk',
  'kSSSkSSSkSSSkSSk',
  '.kkkkkkkkkkkkkk.',
];
const SHELL_B = SHELL_A.map((row, y) =>
  y >= 7 && y <= 12 ? row.replace(/H/g, 'h').replace(/^(.{6})h/, '$1H').replace(/^(.{11})h/, '$1H') : row,
);
const SHELL_PEEK = SHELL_A.map((row, y) =>
  y === 14 ? 'kSYkSSSkSSSkYSSk' : y === 15 ? 'GG.kkkkkkkkkk.GG' : row,
);

const HOPPER_TOP = [
  '................',
  '................',
  '...kkk....kkk...',
  '..kYkYk..kYkYk..',
  '..kYkYkkkkYkYk..',
  '.kGGGGGGGGGGGGk.',
  '.kGlGGGGGGGGGGk.',
  '.kGkkkkkkkkkkGk.',
  '..kGGGGGGGGGGk..',
  '...kkkwrrwkkk...',
  '..kGkswrrwskGk..',
  '.kGGksssssskGGk.',
];
const HOPPER_SIT = [...HOPPER_TOP, 'kGGGksssssskGGGk', 'kGGkkkkkkkkkkGGk', 'kkkk........kkkk', '................'];
const HOPPER_JUMP = [...HOPPER_TOP, '..kksssssssskk..', '..kGkkkkkkkkGk..', '.kGk........kGk.', 'kkk..........kkk'];

const FLINGER_BOTTOM = [
  '...kssssssssk...',
  '...kssssssssk...',
  '...kkkkkkkkkk...',
  '....kss..ssk....',
  '....kss..ssk....',
  '....kss..ssk....',
  '...kkkk..kkkk...',
];
const FLINGER_IDLE = [
  '................',
  '.....kkkkkk.....',
  '...kkGGGGGGkk...',
  '..kGlGGGGGGGGk..',
  '..kGYkYGGYkYGk..',
  '.kkkkkkGGkkkkkk.',
  '..kbkkkGGkbkkk..',
  '..kGGGGGGGGGGk..',
  '...kGkkkkkkGk...',
  '....kkwrrwkk....',
  '..kksswrrwsskk..',
  '.ksskssrrsskssk.',
  '.ksskssrrsskssk.',
  '..kGksssssskGk..',
  ...FLINGER_BOTTOM,
];
const FLINGER_THROW = [
  '............kkk.',
  '.....kkkkkk.kbk.',
  '...kkGGGGGGkkGk.',
  '..kGlGGGGGGGGkGk',
  '..kGYkYGGYkYGksk',
  '.kkkkkkGGkkkkksk',
  '..kbkkkGGkbkkksk',
  '..kGGGGGGGGGGksk',
  '...kGkkkkkkGkksk',
  '....kkwrrwkkssk.',
  '..kksswrrwsssk..',
  '.ksskssrrsssk...',
  '.ksskssrrssk....',
  '..kGksssssssk...',
  ...FLINGER_BOTTOM,
];

const SUNGLASSES = [
  ['........', '........', 'kkkkkkkk', 'kbbkkbbk', 'kkk..kkk', '........', '........', '........'],
  ['...kk...', '...kb...', '...kk...', '...kk...', '...kk...', '...kb...', '...kk...', '........'],
];

// The Reptilian Overlord — symmetric, so drawn as left halves and mirrored.
const OVERLORD_TOP_HALF = [
  '..........k..k..',
  '..........kOkkOk',
  '.........kOOOOOO',
  '.........kOROOOO',
  '........kkkkkkkk',
  '.......kGGGGGGGG',
  '......kGlGGGGGGG',
  '.....kGlGGGGGGGG',
  '.....kGGYYkYGGGG',
  '.....kGGYYkYGGGG',
  '....kkkkkkkkkkGG',
  '....kkObbbbkkkGG',
  '.....kkkkkkkkGGG',
  '.....kGGGGGGGGGG',
];
const OVERLORD_MOUTH = '......kwkwkwkwkk';
const OVERLORD_MOUTH_OPEN = '......kRRRRRRRRR';
const OVERLORD_BODY_HALF = [
  '.......kGGGGGGGG',
  '..ppPPkkkkkkkkkk',
  '.pPPPkssssskkwwr',
  '.pPPkssSsssskwwr',
  'pPPPksSsssssskwr',
  'pPPkGksssssssskr',
  'pPPkGGkssssssssr',
  'pPPkGGkssssssssr',
  'pPPPkkssssssssss',
  'pPPPPkssssssssss',
  'ppPPPkssssssssss',
  'ppPPPPkkkkkkkkOO',
  '.ppPPPkssssssskk',
];
const OVERLORD_LEGS_A = ['..ppPPkssssk....', '...ppPkssssk....', '....ppkkkkkk....', '...kkkkkkkkk....'];
const OVERLORD_LEGS_B = ['..ppPPkssssk....', '...ppPPkssssk...', '....ppPkkkkkk...', '.....kkkkkkkkk..'];

const BEAM = [
  ['................', '....kkkkkk......', '..kkYYYYYYkk....', '.kYYwwwwwwYYkk..', '.kYYwwwwwwYYkk..', '..kkYYYYYYkk....', '....kkkkkk......', '................'],
  ['................', '......kkkkkk....', '....kkYYYYYYkk..', '..kkYYwwwwwwYYk.', '..kkYYwwwwwwYYk.', '....kkYYYYYYkk..', '......kkkkkk....', '................'],
];
const BEAM_PAL: Palette = { k: '#3a8a10', Y: '#9aff40', w: '#f0ffd0' };

function sheet(scene: Phaser.Scene, key: string, frames: string[][], pal: Palette): void {
  const w = Math.max(...frames.flat().map((r) => r.length));
  const h = Math.max(...frames.map((f) => f.length));
  const pc = new PixelCanvas(scene, key, w * frames.length, h);
  frames.forEach((rows, i) => {
    // bottom-align shorter frames so feet stay on the ground
    pc.art(i * w, h - rows.length, rows, pal);
    pc.frame(i, i * w, 0, w, h);
  });
  pc.refresh();
}

export function makeEnemyTextures(scene: Phaser.Scene): void {
  sheet(scene, 'grunt', [GRUNT_A, GRUNT_B, GRUNT_FLAT], PAL);
  sheet(scene, 'shellback', [SHELLBACK_A, SHELLBACK_B], PAL);
  sheet(scene, 'shell', [SHELL_A, SHELL_B, SHELL_PEEK], PAL);
  sheet(scene, 'hopper', [HOPPER_SIT, HOPPER_JUMP], PAL);
  sheet(scene, 'flinger', [FLINGER_IDLE, FLINGER_THROW], PAL);
  sheet(scene, 'sunglasses', SUNGLASSES, PAL);
  const overlord = (mouth: string, legs: string[]) =>
    mirror([...OVERLORD_TOP_HALF, mouth, ...OVERLORD_BODY_HALF, ...legs]);
  sheet(scene, 'overlord', [
    overlord(OVERLORD_MOUTH, OVERLORD_LEGS_A),
    overlord(OVERLORD_MOUTH, OVERLORD_LEGS_B),
    overlord(OVERLORD_MOUTH_OPEN, OVERLORD_LEGS_A),
  ], PAL);
  sheet(scene, 'beam', BEAM, BEAM_PAL);
}

/** Exposed for a dev-time sanity check of row widths. */
export const ART_FOR_CHECK: Record<string, string[]> = {
  GRUNT_A, GRUNT_B, GRUNT_FLAT, SHELLBACK_A, SHELLBACK_B, SHELL_A, SHELL_B, SHELL_PEEK,
  HOPPER_SIT, HOPPER_JUMP, FLINGER_IDLE, FLINGER_THROW,
};
