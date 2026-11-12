import Phaser from 'phaser';

type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'run' | 'start';
const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'jump', 'run', 'start'];

const K = Phaser.Input.Keyboard.KeyCodes;
const KEYMAP: Record<Action, number[]> = {
  left: [K.LEFT, K.A],
  right: [K.RIGHT, K.D],
  up: [K.UP, K.W],
  down: [K.DOWN, K.S],
  jump: [K.SPACE, K.W, K.UP, K.Z],
  run: [K.SHIFT, K.X],
  start: [K.ENTER],
};

/**
 * Keyboard + gamepad abstraction. Call update() once per frame, then read
 * `held(action)` / `pressed(action)` (pressed = went down this frame).
 */
export class Controls {
  private keys: Record<Action, Phaser.Input.Keyboard.Key[]>;
  private cur: Record<Action, boolean>;
  private prev: Record<Action, boolean>;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = {} as Record<Action, Phaser.Input.Keyboard.Key[]>;
    this.cur = {} as Record<Action, boolean>;
    this.prev = {} as Record<Action, boolean>;
    for (const a of ACTIONS) {
      this.keys[a] = KEYMAP[a].map((code) => kb.addKey(code, true));
      this.cur[a] = false;
      this.prev[a] = false;
    }
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    if (!gp || gp.total === 0) return null;
    return gp.getAll()[0] ?? null;
  }

  update(): void {
    const pad = this.pad();
    const ax = pad ? pad.axes[0]?.getValue() ?? 0 : 0;
    const ay = pad ? pad.axes[1]?.getValue() ?? 0 : 0;
    const padState: Record<Action, boolean> = {
      left: !!pad && (pad.left || ax < -0.4),
      right: !!pad && (pad.right || ax > 0.4),
      up: !!pad && (pad.up || ay < -0.5),
      down: !!pad && (pad.down || ay > 0.5),
      jump: !!pad && (pad.A || pad.B),
      run: !!pad && (pad.X || pad.Y || pad.R1 > 0.5 || pad.L1 > 0.5),
      start: !!pad && !!pad.buttons[9]?.pressed,
    };
    for (const a of ACTIONS) {
      this.prev[a] = this.cur[a];
      this.cur[a] = this.keys[a].some((k) => k.isDown) || padState[a];
    }
  }

  held(a: Action): boolean {
    return this.cur[a];
  }

  pressed(a: Action): boolean {
    return this.cur[a] && !this.prev[a];
  }

  /** Swallow currently-held buttons so a press carried over from a previous scene doesn't fire. */
  latch(): void {
    this.update();
    for (const a of ACTIONS) this.prev[a] = this.cur[a];
  }
}
