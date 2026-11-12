// All gameplay tuning lives here (Normal difficulty; src/difficulty.ts scales it for Easy/Hard). Units: pixels, seconds, milliseconds where noted.
// One tile = 16 px. The game renders at 320x240 and is scaled up with nearest-neighbour.

export const TILE = 16;
export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 240;
export const LEVEL_ROWS = 15;

export const PHYSICS = {
  gravity: 1800,          // world gravity (px/s²) — applied to everything
  jumpHoldGravity: 720,   // effective gravity while rising with jump held (variable jump height)
  maxFall: 420,           // terminal velocity
};

export const PLAYER = {
  walkMax: 90,
  runMax: 160,
  walkAccel: 280,
  runAccel: 380,
  airAccelFactor: 0.6,    // fraction of ground acceleration available in the air
  releaseDecel: 320,      // friction when no direction held
  skidDecel: 950,         // deceleration while reversing at speed
  skidMinSpeed: 55,       // reversing faster than this triggers a skid
  overSpeedDecel: 220,    // bleed-off when above the current cap (e.g. let go of run)
  jumpVel: 310,           // jump impulse from standstill…
  runJumpVel: 355,        // …blending up to this at full run speed
  stompBounce: 250,       // bounce off an enemy…
  stompBounceHeld: 390,   // …or higher if jump is held
  coyoteMs: 80,           // grace period to jump after leaving a ledge
  jumpBufferMs: 110,      // jump pressed slightly before landing still counts
  hurtInvulnMs: 2000,     // flicker time after shrinking
  starMs: 10000,          // Golden Crisp invincibility
  transformMs: 640,       // grow/shrink freeze
  kickGraceMs: 220,       // can't be hurt by a shell you just kicked
  maxProjectiles: 2,
  projectileSpeed: 210,
  projectileBounce: 190,
};

export const ENEMY = {
  gruntSpeed: 32,
  shellbackSpeed: 32,
  shellSpeed: 230,
  shellPeekMs: 6500,      // retracted shell starts peeking…
  shellWakeMs: 8000,      // …and walks out again
  hopperVX: 70,
  hopperVY: 370,
  hopperRestMs: 900,
  flingerIntervalMs: 2300,
  flingerThrowVY: 270,
  stompFadeMs: 450,
  activateMargin: 40,     // spawn enemies this far beyond the right edge of the screen
  bossSpeed: 38,
  bossShotMs: 2400,
  bossJumpMs: 3600,
  bossShotSpeed: 120,
};

export const ITEM = {
  crackerSpeed: 55,
  crispSpeed: 75,
  crispBounce: 300,
  emergeMs: 700,
};

export const TIMING = {
  timerTickMs: 400,       // one HUD time unit (the classic "a bit under half a second")
  hurryAt: 100,           // music speeds up below this
  deathPauseMs: 500,
  deathRestartMs: 3200,
  introMs: 2400,
  firebarSpeed: 1.7,      // radians/second
};

// Escalating chain for stomps / shell kills / star kills without touching the ground.
export const CHAIN_SCORES = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];

export const SCORE = {
  onion: 200,
  brick: 50,
  powerup: 1000,
  projectileKill: 200,
  bossKill: 5000,
  timeUnit: 50,
};

export const ONIONS_PER_LIFE = 100;
export const HIGHSCORE_KEY = 'cheese-onion-highscore';
export const MUTE_KEY = 'cheese-onion-muted';
