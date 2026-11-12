import Phaser from 'phaser';
import { PLAYER } from '../config';
import type GameScene from '../scenes/GameScene';

/** Fiery Cheese's projectile: bounces along the ground, pops on walls, knocks out enemies. */
export class PickledOnion extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  declare scene: GameScene;
  private dir: 1 | -1;

  constructor(scene: GameScene, x: number, y: number, dir: 1 | -1) {
    super(scene, x, y, 'pickled');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.playerShots.add(this);
    this.dir = dir;
    this.setDepth(12);
    this.body.setSize(6, 6).setOffset(1, 1);
    this.body.setVelocity(dir * PLAYER.projectileSpeed, 140);
    this.body.setMaxVelocity(400, 400);
  }

  tick(_time: number, dt: number): void {
    const b = this.body;
    this.angle += this.dir * 900 * dt;
    if (b.blocked.left || b.blocked.right) {
      this.pop();
      return;
    }
    if (b.blocked.down) b.setVelocityY(-PLAYER.projectileBounce);
    b.setVelocityX(this.dir * PLAYER.projectileSpeed);
  }

  pop(): void {
    this.scene.poof(this.x, this.y);
    this.destroy();
  }
}
