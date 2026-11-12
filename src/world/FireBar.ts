import Phaser from 'phaser';
import { TIMING } from '../config';
import { diff } from '../state';

const ORBS = 6;
const SPACING = 7.4; // reach ~40px: clears a small Cheese walking under a pivot 3 tiles up
const RADIUS = 3.2;

/** A chain of fire orbs rotating around a block. Hit-tested as circles against the player's box. */
export class FireBar {
  private orbs: Phaser.GameObjects.Image[] = [];
  private angle: number;

  constructor(scene: Phaser.Scene, private cx: number, private cy: number, private dir: number) {
    this.angle = dir > 0 ? 0 : Math.PI;
    for (let i = 0; i < ORBS; i++) this.orbs.push(scene.add.image(cx, cy, 'orb', 0).setDepth(6));
  }

  update(time: number, dt: number): void {
    this.angle += this.dir * TIMING.firebarSpeed * diff().firebarSpeedMul * dt;
    const frame = Math.floor(time / 90) % 2;
    this.orbs.forEach((o, i) => {
      o.setPosition(this.cx + Math.cos(this.angle) * i * SPACING, this.cy + Math.sin(this.angle) * i * SPACING);
      o.setFrame(frame);
    });
  }

  hits(r: Phaser.Geom.Rectangle): boolean {
    return this.orbs.some((o) => {
      const nx = Phaser.Math.Clamp(o.x, r.left, r.right);
      const ny = Phaser.Math.Clamp(o.y, r.top, r.bottom);
      return (o.x - nx) ** 2 + (o.y - ny) ** 2 < RADIUS * RADIUS;
    });
  }
}
