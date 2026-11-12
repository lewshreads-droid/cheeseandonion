import { ENEMY, PLAYER } from '../config';
import { audio } from '../audio/AudioEngine';
import { diff } from '../state';
import type { Player } from '../player/Player';
import type GameScene from '../scenes/GameScene';
import { Enemy } from './Enemy';

type State = 'walk' | 'shell' | 'slide';

/**
 * Agent wearing an armoured carapace. Stomp → retracts into its shell.
 * Touch/stomp the shell → it slides, flattening other enemies and bouncing off walls
 * (it'll hurt you too on the rebound). Leave it alone and it climbs back out.
 */
export class ShellBack extends Enemy {
  private phase: State = 'walk';
  private shellSince = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'shellback', 0);
    this.toWalk();
  }

  private toWalk(): void {
    this.phase = 'walk';
    this.shellMoving = false;
    this.setTexture('shellback', 0);
    this.body.setSize(12, 16).setOffset(2, 7);
  }

  private toShell(): void {
    this.phase = 'shell';
    this.shellMoving = false;
    this.shellSince = this.scene.now;
    this.setTexture('shell', 0);
    this.body.setSize(14, 11).setOffset(1, 5);
    this.body.setVelocityX(0);
  }

  private kick(dir: 1 | -1, player: Player): void {
    this.phase = 'slide';
    this.shellMoving = true;
    this.shellChain = 0;
    this.dir = dir;
    player.kickGraceUntil = this.scene.now + PLAYER.kickGraceMs;
    audio.sfx('kick');
  }

  tick(time: number): void {
    switch (this.phase) {
      case 'walk':
        this.patrol(ENEMY.shellbackSpeed * diff().enemySpeedMul);
        this.setFlipX(this.dir < 0);
        this.setFrame(Math.floor(time / 200) % 2);
        break;
      case 'shell': {
        const t = time - this.shellSince;
        if (t > ENEMY.shellWakeMs) {
          this.y -= 1;
          this.toWalk();
        } else if (t > ENEMY.shellPeekMs) this.setFrame(Math.floor(time / 120) % 2 ? 2 : 0);
        else this.setFrame(0);
        break;
      }
      case 'slide':
        this.patrol(ENEMY.shellSpeed);
        this.setFrame(Math.floor(time / 60) % 2);
        break;
    }
  }

  onStomp(player: Player): boolean {
    if (this.phase === 'walk' || this.phase === 'slide') {
      this.toShell();
    } else {
      this.kick(player.x < this.x ? 1 : -1, player);
    }
    return true;
  }

  onTouch(player: Player): void {
    if (this.phase === 'shell') {
      this.kick(player.x < this.x ? 1 : -1, player);
      this.scene.awardPoints(this.x, this.y - 16, 400);
    }
    else if (this.phase === 'slide' && this.scene.now < player.kickGraceUntil) return;
    else player.hurt();
  }
}
