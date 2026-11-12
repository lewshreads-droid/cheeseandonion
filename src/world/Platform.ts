import Phaser from 'phaser';
import { TILE } from '../config';

const RANGE = 3 * TILE; // sweeps ±3 tiles around where it is placed
const SPEED = 42;

/** One-way crispbread platform that sweeps back and forth (horizontal '-' or vertical '^'). */
export class Platform extends Phaser.GameObjects.TileSprite {
  declare body: Phaser.Physics.Arcade.Body;
  private min: number;
  private max: number;

  constructor(scene: Phaser.Scene, x: number, y: number, tiles: number, readonly vertical: boolean) {
    super(scene, x, y, tiles * TILE, 8, 'platform');
    this.setOrigin(0, 0).setDepth(3);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false).setImmovable(true);
    // one-way: only the top surface is solid
    this.body.checkCollision.down = false;
    this.body.checkCollision.left = false;
    this.body.checkCollision.right = false;
    const start = vertical ? y : x;
    this.min = start - RANGE;
    this.max = start + RANGE;
    if (vertical) this.body.setVelocityY(SPEED);
    else this.body.setVelocityX(SPEED);
  }

  tick(): void {
    const b = this.body;
    if (this.vertical) {
      if (b.y >= this.max && b.velocity.y > 0) b.setVelocityY(-SPEED);
      else if (b.y <= this.min && b.velocity.y < 0) b.setVelocityY(SPEED);
    } else {
      if (b.x >= this.max && b.velocity.x > 0) b.setVelocityX(-SPEED);
      else if (b.x <= this.min && b.velocity.x < 0) b.setVelocityX(SPEED);
    }
  }
}
