import { ENEMY } from '../config';
import { diff } from '../state';
import type GameScene from '../scenes/GameScene';
import { Enemy } from './Enemy';

/** Frog-like agent: sits, then hops in an arc towards Cheese. */
export class Hopper extends Enemy {
  private restUntil = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'hopper', 0);
    this.body.setSize(14, 12).setOffset(1, 4);
    this.walker = false;
    this.restUntil = scene.now + ENEMY.hopperRestMs * Math.random();
  }

  tick(time: number): void {
    const b = this.body;
    const grounded = b.blocked.down || b.touching.down;
    if (grounded) {
      b.setVelocityX(0);
      this.setFrame(0);
      if (this.restUntil === 0) this.restUntil = time + ENEMY.hopperRestMs / diff().enemySpeedMul;
      if (time > this.restUntil) {
        const dir = this.scene.player.x < this.x ? -1 : 1;
        b.setVelocity(dir * ENEMY.hopperVX, -ENEMY.hopperVY);
        this.restUntil = 0;
      }
    } else {
      this.setFrame(1);
      if (b.blocked.left || b.blocked.right) b.setVelocityX(-b.velocity.x);
    }
  }
}
