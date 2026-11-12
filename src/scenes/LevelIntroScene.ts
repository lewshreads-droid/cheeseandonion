import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TIMING } from '../config';
import { audio } from '../audio/AudioEngine';
import { cheeseKey } from '../gfx/textures';
import { diff, G } from '../state';
import { LEVELS } from '../world/LevelData';

/** Black card: "WORLD 1-1", level name, lives remaining. */
export default class LevelIntroScene extends Phaser.Scene {
  constructor() {
    super('LevelIntro');
  }

  create(): void {
    audio.stopMusic();
    this.cameras.main.setBackgroundColor('#000000');
    const lv = LEVELS[G.levelIndex];
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    this.add.bitmapText(cx, cy - 34, 'font', `WORLD ${lv.id}`).setOrigin(0.5).setScale(2);
    this.add.bitmapText(cx, cy - 12, 'font', lv.name.toUpperCase()).setOrigin(0.5).setTint(0xffd84a);
    this.add.image(cx - 14, cy + 22, cheeseKey(G.power !== 'small', 'normal'), 'idle').setOrigin(0.5, 1);
    this.add.bitmapText(cx + 2, cy + 12, 'font', `x  ${G.lives}`).setOrigin(0, 0.5);
    this.add.bitmapText(cx, cy + 44, 'font', diff().label).setOrigin(0.5).setAlpha(0.6);

    if (!this.scene.isActive('HUD')) this.scene.launch('HUD');
    this.scene.bringToTop('HUD');
    this.time.delayedCall(TIMING.introMs, () => this.scene.start('Game', { fresh: true }));
  }
}
