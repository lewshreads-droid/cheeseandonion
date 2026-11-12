import Phaser from 'phaser';
import { ENEMY } from '../config';
import type { Player } from '../player/Player';
import type GameScene from '../scenes/GameScene';

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  declare scene: GameScene;

  dead = false;
  stompable = true;     // can be defeated by landing on it
  walker = true;        // turns around when it bumps another enemy
  shellMoving = false;  // a sliding shell — kills other enemies
  fireproof = false;    // ignores pickled onions
  shellproof = false;   // ignores sliding shells
  dir: 1 | -1 = -1;
  shellChain = 0;
  ignorePlayerUntil = 0; // brief grace after a stomp so the rebound isn't read as a side hit

  constructor(scene: GameScene, x: number, y: number, key: string, frame: number = 0) {
    super(scene, x, y, key, frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(5);
    // face the player when spawning
    this.dir = scene.player.x < x ? -1 : 1;
  }

  /** Per-frame behaviour. Only called while alive and the game isn't frozen. */
  abstract tick(time: number, dt: number): void;

  /** Player landed on top. Return true if the player should bounce (and score the chain). */
  onStomp(_player: Player): boolean {
    this.squash();
    return true;
  }

  /** Player touched any other way. */
  onTouch(player: Player): void {
    player.hurt();
  }

  /** Knocked out by a shell, projectile, star or block bump: flips upside-down and falls off screen. */
  knockOut(dirX: number): void {
    if (this.dead) return;
    this.dead = true;
    this.shellMoving = false;
    this.setFlipY(true);
    this.body.setAllowGravity(true);
    this.body.setVelocity(dirX * 50, -260);
    this.setDepth(25);
  }

  /** Stomped flat: shows the flat frame (or squashes) then fades away. */
  squash(flatFrame?: number): void {
    if (this.dead) return;
    this.dead = true;
    this.body.setEnable(false);
    if (flatFrame !== undefined) this.setFrame(flatFrame);
    else this.setScale(1.15, 0.4);
    this.scene.tweens.add({
      targets: this, alpha: 0, delay: ENEMY.stompFadeMs * 0.6, duration: ENEMY.stompFadeMs * 0.4,
      onComplete: () => this.destroy(),
    });
  }

  /** Patrol helper: reverse at walls, keep a constant speed. */
  protected patrol(speed: number): void {
    if (this.body.blocked.left) this.dir = 1;
    else if (this.body.blocked.right) this.dir = -1;
    this.body.setVelocityX(this.dir * speed);
  }
}
