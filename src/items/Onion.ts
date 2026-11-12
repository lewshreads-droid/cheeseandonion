import Phaser from 'phaser';
import type GameScene from '../scenes/GameScene';

/** A floating onion collectible that bobs gently. 100 = extra life. */
export class Onion extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'onion', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.onions.add(this);
    this.setDepth(4);
    this.body.setAllowGravity(false).setImmovable(true);
    this.body.setSize(10, 12).setOffset(3, 3);
    scene.tweens.add({
      targets: this, y: y - 2, duration: 700 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      delay: (x * 7) % 500,
    });
  }

  tick(time: number): void {
    // occasional glint
    this.setFrame((time + this.x * 13) % 1600 < 120 ? 1 : 0);
  }
}
