import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { audio } from '../audio/AudioEngine';
import { G } from '../state';
import { LEVELS } from '../world/LevelData';

/** Overlay that runs above Game / LevelIntro. Polls G every frame; owns pause. */
export default class HUDScene extends Phaser.Scene {
  private score!: Phaser.GameObjects.BitmapText;
  private onions!: Phaser.GameObjects.BitmapText;
  private world!: Phaser.GameObjects.BitmapText;
  private timeText!: Phaser.GameObjects.BitmapText;
  private lives!: Phaser.GameObjects.BitmapText;
  private fps!: Phaser.GameObjects.BitmapText;
  private mute!: Phaser.GameObjects.BitmapText;
  private pauseLayer!: Phaser.GameObjects.Container;
  private padStartWas = false;

  constructor() {
    super('HUD');
  }

  create(): void {
    const col = (x: number, label: string) => {
      this.add.bitmapText(x, 6, 'font', label).setOrigin(0.5, 0);
      return this.add.bitmapText(x, 16, 'font', '').setOrigin(0.5, 0);
    };
    this.score = col(34, 'SCORE');
    this.onions = col(98, 'ONIONS');
    this.add.image(87, 19, 'onion-icon').setOrigin(0.5, 0.5);
    this.world = col(162, 'WORLD');
    this.timeText = col(222, 'TIME');
    this.lives = col(282, 'LIVES');
    this.fps = this.add.bitmapText(4, GAME_HEIGHT - 10, 'font', '').setTint(0x80ff80);
    this.mute = this.add.bitmapText(GAME_WIDTH - 4, GAME_HEIGHT - 10, 'font', 'MUTE').setOrigin(1, 0).setTint(0xff8080);

    const dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45).setOrigin(0);
    const txt = this.add.bitmapText(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'font', 'PAUSED').setOrigin(0.5).setScale(2);
    const sub = this.add.bitmapText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 18, 'font', 'ESC / P TO RESUME').setOrigin(0.5);
    this.pauseLayer = this.add.container(0, 0, [dim, txt, sub]).setVisible(false);

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.togglePause());
    kb.on('keydown-P', () => this.togglePause());
  }

  update(): void {
    this.score.setText(String(G.score).padStart(6, '0'));
    this.onions.setText(' x' + String(G.onions).padStart(2, '0'));
    this.world.setText(LEVELS[Math.min(G.levelIndex, LEVELS.length - 1)].id);
    this.timeText.setText(this.scene.isActive('Game') || this.scene.isPaused('Game') ? String(G.time).padStart(3, '0') : '');
    this.lives.setText('x' + G.lives);
    this.fps.setText(G.debug ? `FPS ${Math.round(this.game.loop.actualFps)}` : '');
    this.mute.setVisible(audio.muted);

    // gamepad Start toggles pause (edge-triggered)
    const pad = this.input.gamepad && this.input.gamepad.total ? this.input.gamepad.getAll()[0] : null;
    const start = !!pad?.buttons[9]?.pressed;
    if (start && !this.padStartWas) this.togglePause();
    this.padStartWas = start;
  }

  private togglePause(): void {
    if (this.scene.isPaused('Game')) {
      this.scene.resume('Game');
      audio.resumeMusic();
      this.pauseLayer.setVisible(false);
    } else if (this.scene.isActive('Game')) {
      this.scene.pause('Game');
      audio.pauseMusic();
      audio.sfx('pause');
      this.pauseLayer.setVisible(true);
    }
  }
}
