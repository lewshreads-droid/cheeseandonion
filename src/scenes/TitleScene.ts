import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { audio } from '../audio/AudioEngine';
import { cheeseKey, THEME_COLS } from '../gfx/textures';
import { Controls } from '../input';
import { G, resetRun, setDifficulty } from '../state';
import { DIFFICULTIES, DIFFICULTY, Difficulty } from '../difficulty';
import { T } from '../world/tiles';

export default class TitleScene extends Phaser.Scene {
  private controls!: Controls;
  private modeText!: Phaser.GameObjects.BitmapText;
  private blurbText!: Phaser.GameObjects.BitmapText;
  private topText!: Phaser.GameObjects.BitmapText;
  private cheese!: Phaser.GameObjects.Image;
  private nextBlink = 0;

  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(THEME_COLS.overworld.bg);
    // scenery
    this.add.image(60, 208, 'hill-big').setOrigin(0.5, 1);
    this.add.image(270, 208, 'hill-small').setOrigin(0.5, 1);
    this.add.image(40, 30, 'cloud-small');
    this.add.image(280, 22, 'cloud-big');
    this.add.image(250, 208, 'bush').setOrigin(0.5, 1);
    for (let x = 0; x < GAME_WIDTH; x += 16) {
      this.add.image(x, 208, 'tiles-overworld', T.GROUND_TOP).setOrigin(0, 0);
      this.add.image(x, 224, 'tiles-overworld', T.GROUND).setOrigin(0, 0);
    }

    const logo = this.add.image(GAME_WIDTH / 2, 50, 'logo');
    this.tweens.add({ targets: logo, y: 54, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const prompt = this.add.bitmapText(GAME_WIDTH / 2, 110, 'font', 'PRESS ENTER TO START').setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.15, duration: 500, yoyo: true, repeat: -1 });

    // difficulty selector: left/right to change
    this.modeText = this.add.bitmapText(GAME_WIDTH / 2, 125, 'font', '').setOrigin(0.5);
    this.blurbText = this.add.bitmapText(GAME_WIDTH / 2, 136, 'font', '').setOrigin(0.5).setTint(0xdfefff).setAlpha(0.85);
    this.topText = this.add.bitmapText(GAME_WIDTH / 2, 149, 'font', '').setOrigin(0.5).setTint(0xfff08a);
    this.showMode();

    const help = [
      'ARROWS / A D  MOVE     DOWN  CROUCH',
      'SPACE / W / UP  JUMP   SHIFT / X  RUN',
      'M  MUTE   ESC / P  PAUSE   F1  DEBUG',
    ];
    help.forEach((l, i) => this.add.bitmapText(GAME_WIDTH / 2, 164 + i * 10, 'font', l).setOrigin(0.5).setTint(0xdfefff));

    // Cheese idling beside an onion
    this.cheese = this.add.image(142, 208, cheeseKey(false, 'normal'), 'idle').setOrigin(0.5, 1);
    const onion = this.add.image(166, 207, 'onion', 0).setOrigin(0.5, 1);
    this.tweens.add({ targets: onion, y: 205, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.bitmapText(GAME_WIDTH - 4, GAME_HEIGHT - 10, 'font', 'V1.0').setOrigin(1, 0).setAlpha(0.6);

    this.controls = new Controls(this);
    this.controls.latch();
    audio.playMusic('title');
  }

  update(time: number): void {
    this.controls.update();
    // blink + glance at the onion now and then
    if (time > this.nextBlink) {
      this.cheese.setFrame('blink');
      if (time > this.nextBlink + 140) {
        this.cheese.setFrame('idle');
        this.nextBlink = time + 1500 + Math.random() * 2500;
      }
    }
    const step = (this.controls.pressed('right') ? 1 : 0) - (this.controls.pressed('left') ? 1 : 0);
    if (step) {
      const i = DIFFICULTIES.indexOf(G.difficulty);
      setDifficulty(DIFFICULTIES[(i + step + DIFFICULTIES.length) % DIFFICULTIES.length]);
      this.showMode();
      audio.unlock();
      audio.sfx('select');
    }
    if (this.controls.pressed('start') || this.controls.pressed('jump')) {
      audio.unlock();
      audio.sfx('select');
      resetRun();
      this.scene.start('LevelIntro');
    }
  }

  private showMode(): void {
    const tints: Record<Difficulty, number> = { easy: 0x9af08a, normal: 0xffffff, hard: 0xff8a6a };
    this.modeText.setText(`<  ${DIFFICULTY[G.difficulty].label}  >`).setTint(tints[G.difficulty]);
    this.blurbText.setText(DIFFICULTY[G.difficulty].blurb);
    this.topText.setText(`TOP - ${String(G.highScore).padStart(6, '0')}`);
  }
}
