import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PHYSICS } from './config';
import { audio } from './audio/AudioEngine';
import { G } from './state';
import BootScene from './scenes/BootScene';
import TitleScene from './scenes/TitleScene';
import LevelIntroScene from './scenes/LevelIntroScene';
import GameScene from './scenes/GameScene';
import HUDScene from './scenes/HUDScene';
import GameOverScene from './scenes/GameOverScene';
import VictoryScene from './scenes/VictoryScene';

// Global keys that work in every scene. Any key also unlocks Web Audio (browsers need a gesture).
window.addEventListener('keydown', (e) => {
  audio.unlock();
  if (e.code === 'KeyM' && !e.repeat) audio.toggleMute();
  if (e.code === 'F1') {
    e.preventDefault();
    if (!e.repeat) G.debug = !G.debug;
  }
});
window.addEventListener('pointerdown', () => audio.unlock());

// Whole-number zoom only, so every game pixel is the same size on screen (no shimmering).
const integerZoom = () =>
  Math.max(1, Math.floor(Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH, zoom: integerZoom() },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.gravity },
      fps: 60,
      fixedStep: true,
      tileBias: 20,
      debug: false,
    },
  },
  input: { gamepad: true },
  // Dev-only: ?timer drives the loop with setTimeout so a backgrounded tab keeps ticking (handy for automated testing).
  fps: { target: 60, forceSetTimeOut: import.meta.env.DEV && new URLSearchParams(location.search).has('timer') },
  scene: [BootScene, TitleScene, LevelIntroScene, GameScene, HUDScene, GameOverScene, VictoryScene],
});

window.addEventListener('resize', () => game.scale.setZoom(integerZoom()));

// Dev builds only: expose live objects for console poking. Stripped from production builds.
if (import.meta.env.DEV) Object.assign(window, { __game: game, __G: G, __audio: audio });
