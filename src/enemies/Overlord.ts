import Phaser from 'phaser';
import { ENEMY, SCORE } from '../config';
import { audio } from '../audio/AudioEngine';
import { addScore, diff } from '../state';
import type GameScene from '../scenes/GameScene';
import { Enemy } from './Enemy';
import { EnemyShot } from './EnemyShot';

/**
 * The Reptilian Overlord: paces the bridge, hops, and fires eye-beams from his sunglasses.
 * Can't be stomped. Pickled onions finish him (3/5/8 by difficulty) — or pull the lever behind him.
 */
export class Overlord extends Enemy {
  private hp = diff().bossHealth;
  private homeX: number;
  private nextShot: number;
  private nextJump: number;
  private nextTurn = 0;
  private mouthUntil = 0;
  panic = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'overlord', 0);
    this.body.setSize(22, 28).setOffset(5, 4);
    this.stompable = false;
    this.walker = false;
    this.shellproof = true;
    this.homeX = x;
    const t = scene.now;
    this.nextShot = t + 1500;
    this.nextJump = t + ENEMY.bossJumpMs;
  }

  tick(time: number): void {
    const b = this.body;
    const p = this.scene.player;
    this.setFlipX(p.x > this.x);
    if (this.panic) {
      b.setVelocityX(0);
      this.setFrame(2);
      return;
    }
    const grounded = b.blocked.down || b.touching.down;
    if (time > this.nextTurn) {
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.nextTurn = time + 700 + Math.random() * 1100;
    }
    if (this.x < this.homeX - 48) this.dir = 1;
    if (this.x > this.homeX + 24) this.dir = -1;
    const d = diff();
    b.setVelocityX(grounded ? this.dir * ENEMY.bossSpeed * d.enemySpeedMul : b.velocity.x);
    if (grounded && time > this.nextJump) {
      b.setVelocityY(-300);
      this.nextJump = time + ENEMY.bossJumpMs * (0.7 + Math.random() * 0.6);
    }
    if (time > this.nextShot && this.scene.onScreen(this.x)) {
      const dir = p.x < this.x ? -1 : 1;
      const targetY = Phaser.Math.Clamp(p.y - 10, this.y - 40, this.y - 8);
      const sy = this.y - 21;
      const speed = ENEMY.bossShotSpeed * d.shotSpeedMul;
      const travel = Math.max(40, Math.abs(p.x - this.x)) / speed;
      new EnemyShot(this.scene, this.x + dir * 12, sy, 'beam', dir * speed, Phaser.Math.Clamp((targetY - sy) / travel, -40, 40), false);
      audio.sfx('beam');
      this.mouthUntil = time + 300;
      this.nextShot = time + ENEMY.bossShotMs * d.throwIntervalMul * (0.75 + Math.random() * 0.5);
    }
    this.setFrame(time < this.mouthUntil ? 2 : Math.floor(time / 220) % 2);
  }

  onStomp(): boolean {
    return false;
  }

  /** Hit by a pickled onion. */
  hit(): void {
    if (this.dead) return;
    this.hp--;
    audio.sfx('bossHit');
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.clearTint());
    if (this.hp <= 0) this.defeat();
  }

  defeat(): void {
    if (this.dead || !this.active) return;
    addScore(SCORE.bossKill);
    this.scene.popup(this.x, this.y - 36, SCORE.bossKill);
    audio.sfx('bossFall');
    this.knockOut(0);
  }
}
