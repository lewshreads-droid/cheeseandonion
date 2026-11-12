import Phaser from 'phaser';
import { generateTextures } from '../gfx/textures';

/** Generates every texture, the font and the logo at start-up. No image files are loaded. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateTextures(this);
    this.scene.start('Title');
  }
}
