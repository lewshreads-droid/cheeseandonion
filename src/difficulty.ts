// Difficulty modes. Multipliers apply on top of the base values in config.ts (Normal = the base game).

export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

export interface DifficultySettings {
  label: string;
  blurb: string;            // one line shown on the title screen
  lives: number;
  startBig: boolean;        // every life starts as Mature Cheddar
  timeMul: number;          // level time limit
  enemySpeedMul: number;    // walking / hopping / boss pacing speed
  throwIntervalMul: number; // Flinger and Overlord attack gaps (higher = less often)
  shotSpeedMul: number;     // Overlord eye-beam speed
  firebarSpeedMul: number;
  bossHealth: number;       // pickled-onion hits to defeat the Overlord
  hurtInvulnMs: number;     // flicker time after shrinking
  checkpoints: boolean;     // mid-level respawn points
}

export const DIFFICULTY: Record<Difficulty, DifficultySettings> = {
  easy: {
    label: 'EASY',
    blurb: '5 LIVES - START BIG - SLOWER AGENTS',
    lives: 5,
    startBig: true,
    timeMul: 1.5,
    enemySpeedMul: 0.75,
    throwIntervalMul: 1.6,
    shotSpeedMul: 0.8,
    firebarSpeedMul: 0.7,
    bossHealth: 3,
    hurtInvulnMs: 3000,
    checkpoints: true,
  },
  normal: {
    label: 'NORMAL',
    blurb: 'THE GAME AS DESIGNED',
    lives: 3,
    startBig: false,
    timeMul: 1,
    enemySpeedMul: 1,
    throwIntervalMul: 1,
    shotSpeedMul: 1,
    firebarSpeedMul: 1,
    bossHealth: 5,
    hurtInvulnMs: 2000,
    checkpoints: true,
  },
  hard: {
    label: 'HARD',
    blurb: 'NO CHECKPOINTS - FASTER AGENTS - LESS TIME',
    lives: 3,
    startBig: false,
    timeMul: 0.75,
    enemySpeedMul: 1.25,
    throwIntervalMul: 0.7,
    shotSpeedMul: 1.2,
    firebarSpeedMul: 1.3,
    bossHealth: 8,
    hurtInvulnMs: 1500,
    checkpoints: false,
  },
};
