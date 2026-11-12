import Phaser from 'phaser';

export type Palette = Record<string, string>;

/**
 * Thin wrapper over a Phaser CanvasTexture with pixel-exact drawing primitives.
 * Nothing is anti-aliased: every primitive decides per pixel.
 */
export class PixelCanvas {
  readonly tex: Phaser.Textures.CanvasTexture;
  readonly ctx: CanvasRenderingContext2D;

  constructor(scene: Phaser.Scene, key: string, readonly width: number, readonly height: number) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    this.tex = scene.textures.createCanvas(key, width, height)!;
    this.ctx = this.tex.getContext();
    this.ctx.imageSmoothingEnabled = false;
  }

  px(x: number, y: number, c: string): void {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  rect(x: number, y: number, w: number, h: number, c: string): void {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  clear(x: number, y: number, w: number, h: number): void {
    this.ctx.clearRect(x, y, w, h);
  }

  /** Filled ellipse centred at (cx, cy) — pixel centres inside the ellipse are lit. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): void {
    this.ctx.fillStyle = c;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  disc(cx: number, cy: number, r: number, c: string): void {
    this.ellipse(cx, cy, r, r, c);
  }

  /** Erase (make transparent) a disc — for rings. */
  eraseDisc(cx: number, cy: number, r: number): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r * r) this.ctx.clearRect(x, y, 1, 1);
      }
  }

  /** Filled polygon using pixel-centre containment (even-odd rule). */
  poly(pts: [number, number][], c: string, ox = 0, oy = 0, clip?: (x: number, y: number) => boolean): void {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    this.ctx.fillStyle = c;
    for (let y = Math.floor(Math.min(...ys)); y < Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(Math.min(...xs)); x < Math.ceil(Math.max(...xs)); x++) {
        if (pointInPoly(x + 0.5, y + 0.5, pts) && (!clip || clip(x, y))) this.ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Draw ASCII pixel art. '.' and ' ' are transparent; other chars look up the palette. */
  art(ox: number, oy: number, rows: string[], pal: Palette, flipX = false): void {
    const w = Math.max(...rows.map((r) => r.length));
    rows.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (!c) continue;
        this.px(ox + (flipX ? w - 1 - i : i), oy + y, c);
      }
    });
  }

  /** Register a named frame (sub-rectangle) on this texture. */
  frame(name: string | number, x: number, y: number, w: number, h: number): void {
    this.tex.add(name, 0, x, y, w, h);
  }

  refresh(): void {
    this.tex.refresh();
  }
}

export function pointInPoly(x: number, y: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Mirror the left half of symmetric pixel art to make the full row. */
export function mirror(rows: string[]): string[] {
  return rows.map((r) => r + r.split('').reverse().join(''));
}

/** Deterministic PRNG (mulberry32) so generated art and decor are stable between runs. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * (amt > 0 ? 255 - v : v))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
