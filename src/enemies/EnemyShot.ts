import Phaser from 'phaser';
import type GameScene from '../scenes/GameScene';

/** Thrown sunglasses or the Overlord's eye-beam. Passes through scenery; hurts on contact. */
export class EnemyShot extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private born: number;

  constructor(scene: GameScene, x: number, y: number, key: 'sunglasses' | 'beam', vx: number, vy: number, gravity: boolean) {
    super(scene, x, y, key, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.enemyShots.add(this);
    this.setDepth(12);
    this.body.setAllowGravity(gravity);
    if (key === 'sunglasses') this.body.setSize(6, 4).setOffset(1, 2);
    else this.body.setSize(12, 4).setOffset(2, 2);
    this.body.setVelocity(vx, vy);
    this.setFlipX(vx < 0);
    this.born = scene.now;
  }

  tick(time: number): void {
    this.setFrame(Math.floor((time - this.born) / 70) % 2);
  }
}
