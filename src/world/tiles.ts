// Tile indices into each theme's generated tileset (one 16x16 frame per index).

export const T = {
  GROUND_TOP: 0,
  GROUND: 1,
  BRICK: 2,
  SALT0: 3,
  SALT1: 4,
  SALT2: 5,
  USED: 6,
  SOLID: 7,
  GRATER_TL: 8,
  GRATER_TR: 9,
  GRATER_L: 10,
  GRATER_R: 11,
  LAVA_TOP0: 12,
  LAVA_TOP1: 13,
  LAVA: 14,
  BRIDGE: 15,
  TREE_L: 16,
  TREE_M: 17,
  TREE_R: 18,
  TRUNK: 19,
  CHAIN: 20,
} as const;

export const TILE_COUNT = 21;

export const SOLID_TILES: number[] = [
  T.GROUND_TOP, T.GROUND, T.BRICK, T.SALT0, T.SALT1, T.SALT2, T.USED, T.SOLID,
  T.GRATER_TL, T.GRATER_TR, T.GRATER_L, T.GRATER_R, T.BRIDGE, T.TREE_L, T.TREE_M, T.TREE_R,
];

export const isSalt = (i: number) => i === T.SALT0 || i === T.SALT1 || i === T.SALT2;
export const isLava = (i: number) => i === T.LAVA || i === T.LAVA_TOP0 || i === T.LAVA_TOP1;

export type Theme = 'overworld' | 'underground' | 'sky' | 'castle';
export const THEMES: Theme[] = ['overworld', 'underground', 'sky', 'castle'];
