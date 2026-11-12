import { ENEMY } from '../config';
import { diff } from '../state';
import type GameScene from '../scenes/GameScene';
import { Enemy } from './Enemy';

/** Basic agent: marches back and forth, turns at walls, happily walks off ledges. */
export class Grunt extends Enemy {
  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 'grunt', 0);
    this.body.setSize(12, 13).setOffset(2, 3);
  }

  tick(time: number): void {
    this.patrol(ENEMY.gruntSpeed * diff().enemySpeedMul);
    this.setFrame(Math.floor(time / 180) % 2);
  }

  onStomp(): boolean {
    this.squash(2);
    return true;
  }
}
