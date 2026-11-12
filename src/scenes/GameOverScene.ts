import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { audio } from '../audio/AudioEngine';
import { Controls } from '../input';
import { diff, G, saveHighScore } from '../state';

export default class GameOverScene extends Phaser.Scene {
  private controls!: Controls;
  private canLeave = false;

  constructor() {
    super('GameOver');
  }

  create(): void {
    const best = G.score >= G.highScore && G.score > 0;
    saveHighScore();
    this.cameras.main.setBackgroundColor('#000000');
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    this.add.bitmapText(cx, cy - 30, 'font', 'GAME OVER').setOrigin(0.5).setScale(2).setTint(0xff6a48);
    this.add.bitmapText(cx, cy + 2, 'font', `SCORE  ${String(G.score).padStart(6, '0')}`).setOrigin(0.5);
    this.add.bitmapText(cx, cy + 14, 'font', `TOP    ${String(G.highScore).padStart(6, '0')}  ${diff().label}`).setOrigin(0.5).setTint(0xfff08a);
    if (best) this.add.bitmapText(cx, cy + 30, 'font', 'NEW HIGH SCORE!').setOrigin(0.5).setTint(0x9af08a);
    this.add.image(cx, cy + 62, 'grunt', 0).setOrigin(0.5, 1);
    this.add.bitmapText(cx, cy + 76, 'font', 'THE AGENTS WIN THIS ROUND').setOrigin(0.5).setAlpha(0.7);

    this.controls = new Controls(this);
    this.controls.latch();
    audio.playMusic('gameover');
    this.canLeave = false;
    this.time.delayedCall(1200, () => (this.canLeave = true));
    this.time.delayedCall(7000, () => this.scene.start('Title'));
  }

  update(): void {
    this.controls.update();
    if (this.canLeave && (this.controls.pressed('start') || this.controls.pressed('jump'))) this.scene.start('Title');
  }
}
