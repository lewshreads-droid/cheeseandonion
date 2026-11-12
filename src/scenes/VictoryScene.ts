import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { audio } from '../audio/AudioEngine';
import { cheeseKey, THEME_COLS } from '../gfx/textures';
import { Controls } from '../input';
import { diff, G, saveHighScore } from '../state';
import { T } from '../world/tiles';

export default class VictoryScene extends Phaser.Scene {
  private controls!: Controls;
  private canLeave = false;

  constructor() {
    super('Victory');
  }

  create(): void {
    saveHighScore();
    this.cameras.main.setBackgroundColor(THEME_COLS.sky.bg);
    for (let x = 0; x < GAME_WIDTH; x += 16) {
      this.add.image(x, 208, 'tiles-overworld', T.GROUND_TOP).setOrigin(0, 0);
      this.add.image(x, 224, 'tiles-overworld', T.GROUND).setOrigin(0, 0);
    }
    this.add.image(250, 208, 'hut').setOrigin(0.5, 1);
    this.add.image(60, 30, 'cloud-pink');

    const cx = GAME_WIDTH / 2;
    const lines: [string, number, number][] = [
      ['THE OVERLORD IS TOAST!', 30, 0xffd84a],
      ['THE ONIONS ARE SAFE AND', 54, 0xffffff],
      ['THE LAIR LIES IN RUINS.', 66, 0xffffff],
      ['THANK YOU, CHEESE!', 86, 0x9af08a],
      [`SCORE  ${String(G.score).padStart(6, '0')}`, 110, 0xffffff],
      [`TOP    ${String(G.highScore).padStart(6, '0')}  ${diff().label}`, 122, 0xfff08a],
    ];
    for (const [t, y, tint] of lines) this.add.bitmapText(cx, y, 'font', t).setOrigin(0.5).setTint(tint);
    const prompt = this.add.bitmapText(cx, 146, 'font', 'PRESS ENTER').setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });

    // the hero, and a gentle rain of onions
    const hero = this.add.image(110, 208, cheeseKey(true, G.power === 'fire' ? 'fire' : 'normal'), 'jump').setOrigin(0.5, 1);
    this.tweens.add({ targets: hero, y: 190, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.out' });
    this.time.addEvent({
      delay: 260, loop: true,
      callback: () => {
        const o = this.add.image(Phaser.Math.Between(10, GAME_WIDTH - 10), -10, 'onion', 0).setDepth(-1);
        this.tweens.add({ targets: o, y: GAME_HEIGHT + 20, angle: Phaser.Math.Between(-180, 180), duration: 3000, onComplete: () => o.destroy() });
      },
    });

    this.controls = new Controls(this);
    this.controls.latch();
    audio.playMusic('victory');
    this.canLeave = false;
    this.time.delayedCall(1500, () => (this.canLeave = true));
  }

  update(): void {
    this.controls.update();
    if (this.canLeave && (this.controls.pressed('start') || this.controls.pressed('jump'))) this.scene.start('Title');
  }
}
