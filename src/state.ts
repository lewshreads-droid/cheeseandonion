import { CHAIN_SCORES, HIGHSCORE_KEY, ONIONS_PER_LIFE } from './config';
import { DIFFICULTIES, DIFFICULTY, Difficulty, DifficultySettings } from './difficulty';

export type Power = 'small' | 'big' | 'fire';

const DIFFICULTY_KEY = 'cheese-onion-difficulty';
const initialDifficulty = loadDifficulty();

/** Run-wide game state. The HUD polls this every frame, so there's no event plumbing. */
export const G = {
  score: 0,
  onions: 0,
  lives: DIFFICULTY[initialDifficulty].lives,
  levelIndex: 0,
  time: 400,
  power: 'small' as Power,
  checkpoint: false,
  difficulty: initialDifficulty,
  highScore: loadHighScore(initialDifficulty),
  debug: false,
  /** Set by the HUD so the Game scene can show "1UP" popups etc. via a callback. */
  onExtraLife: null as null | (() => void),
};

/** Settings for the current difficulty. */
export const diff = (): DifficultySettings => DIFFICULTY[G.difficulty];

/** Power-up state a fresh life starts in. */
export const startPower = (): Power => (diff().startBig ? 'big' : 'small');

export function setDifficulty(d: Difficulty): void {
  G.difficulty = d;
  G.highScore = loadHighScore(d);
  try { localStorage.setItem(DIFFICULTY_KEY, d); } catch { /* ignore */ }
}

export function resetRun(): void {
  G.score = 0;
  G.onions = 0;
  G.lives = diff().lives;
  G.levelIndex = 0;
  G.power = startPower();
  G.checkpoint = false;
}

export function addScore(n: number): void {
  G.score += n;
  if (G.score > G.highScore) G.highScore = G.score;
}

export function addLife(): void {
  G.lives = Math.min(G.lives + 1, 99);
  G.onExtraLife?.();
}

export function addOnion(): void {
  G.onions++;
  if (G.onions >= ONIONS_PER_LIFE) {
    G.onions -= ONIONS_PER_LIFE;
    addLife();
  }
}

/** Score for the nth enemy in a chain (0-based). Returns -1 for an extra life. */
export function chainScore(n: number): number {
  return n < CHAIN_SCORES.length ? CHAIN_SCORES[n] : -1;
}

// Each difficulty keeps its own high score. Normal uses the original key, so old scores carry over.
const scoreKey = (d: Difficulty) => (d === 'normal' ? HIGHSCORE_KEY : `${HIGHSCORE_KEY}-${d}`);

function loadHighScore(d: Difficulty): number {
  try {
    return parseInt(localStorage.getItem(scoreKey(d)) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function loadDifficulty(): Difficulty {
  try {
    const d = localStorage.getItem(DIFFICULTY_KEY) as Difficulty | null;
    return d && DIFFICULTIES.includes(d) ? d : 'normal';
  } catch {
    return 'normal';
  }
}

export function saveHighScore(): void {
  G.highScore = Math.max(G.highScore, G.score);
  try {
    localStorage.setItem(scoreKey(G.difficulty), String(G.highScore));
  } catch {
    /* storage unavailable — keep it in memory */
  }
}
