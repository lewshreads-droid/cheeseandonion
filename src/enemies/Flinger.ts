import Phaser from 'phaser';
import { ENEMY } from '../config';
import { audio } from '../audio/AudioEngine';
import { diff } from '../state';
import type GameScene from '../scenes/GameScene';
import { Enemy } from './Enemy';
import { EnemyShot } from './EnemyShot';

/** Stands its ground on a ledge or grater and lobs spinning sunglasses at Cheese on a timer. */
export class Flinger extends Enemy {
  private nextThrow: number;
  private windupUntil = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'flinger', 0);
    this.body.setSize(12, 18).setOffset(2, 3);
    this.walker = false;
    this.nextThrow = scene.now + 800;
  }

  tick(time: number): void {
    this.body.setVelocityX(0);
    const p = this.scene.player;
    const dir = p.x < this.x ? -1 : 1;
    this.setFlipX(dir < 0);
    if (this.windupUntil && time > this.windupUntil) {
      this.windupUntil = 0;
      this.setFrame(0);
      const dx = Math.abs(p.x - this.x);
      const vx = dir * Phaser.Math.Clamp(dx * 0.75, 40, 120);
      new EnemyShot(this.scene, this.x + dir * 6, this.y - 20, 'sunglasses', vx, -ENEMY.flingerThrowVY, true);
      audio.sfx('throw');
    } else if (!this.windupUntil && time > this.nextThrow && this.scene.onScreen(this.x)) {
      this.setFrame(1);
      this.windupUntil = time + 280;
      this.nextThrow = time + ENEMY.flingerIntervalMs * diff().throwIntervalMul * (0.8 + Math.random() * 0.4);
    }
  }
}
