import Phaser from 'phaser';
import { ITEM, SCORE } from '../config';
import { audio } from '../audio/AudioEngine';
import { addLife, addScore } from '../state';
import type { Player } from '../player/Player';
import type GameScene from '../scenes/GameScene';

export type PowerKind = 'cracker' | 'chilli' | 'crisp' | 'lucky';

const TEXTURE: Record<PowerKind, string> = { cracker: 'cracker', chilli: 'chilli', crisp: 'crisp', lucky: 'lucky' };

/**
 * Cracker  — small → Mature Cheddar (big). Slides along.
 * Chilli   — big → Fiery Cheese. Stays put.
 * Crisp    — Golden Crisp, ten seconds of invincibility. Bounces.
 * Lucky    — golden onion, extra life. Slides along.
 * All rise out of the block that held them.
 */
export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  declare scene: GameScene;
  emerging = true;
  private dir: 1 | -1 = 1;

  constructor(scene: GameScene, tileX: number, tileY: number, readonly kind: PowerKind) {
    super(scene, tileX * 16 + 8, (tileY + 1) * 16, TEXTURE[kind], 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.items.add(this);
    this.setOrigin(0.5, 1).setDepth(-1);
    this.body.setSize(14, 14).setOffset(1, 2);
    this.body.setEnable(false);
    audio.sfx('appear');
    scene.tweens.add({
      targets: this, y: tileY * 16, duration: ITEM.emergeMs, ease: 'Linear',
      onComplete: () => {
        this.emerging = false;
        this.setDepth(4);
        this.body.setEnable(true);
        this.body.reset(this.x, this.y);
        if (kind === 'chilli') this.body.setAllowGravity(false).setImmovable(true);
        else if (kind === 'crisp') this.body.setVelocity(ITEM.crispSpeed, -ITEM.crispBounce * 0.6);
        else this.body.setVelocityX(ITEM.crackerSpeed);
      },
    });
  }

  tick(time: number): void {
    if (this.emerging) return;
    const b = this.body;
    if (this.kind === 'chilli' || this.kind === 'lucky') this.setFrame(Math.floor(time / 150) % 2);
    if (this.kind === 'crisp') {
      this.setFrame(Math.floor(time / 80) % 2);
      if (b.blocked.down) b.setVelocityY(-ITEM.crispBounce);
    }
    if (this.kind === 'chilli') return;
    if (b.blocked.left) this.dir = 1;
    else if (b.blocked.right) this.dir = -1;
    b.setVelocityX(this.dir * (this.kind === 'crisp' ? ITEM.crispSpeed : ITEM.crackerSpeed));
  }

  /** Knocked upwards by a block bumped beneath it. */
  hop(awayFromX: number): void {
    if (this.emerging || this.kind === 'chilli') return;
    this.dir = this.x < awayFromX ? -1 : 1;
    this.body.setVelocityY(-230);
  }

  collect(player: Player): void {
    const s = this.scene;
    switch (this.kind) {
      case 'cracker':
        if (player.power === 'small') player.grow('big');
        else audio.sfx('powerup');
        break;
      case 'chilli':
        if (player.power === 'small') player.grow('big');
        else if (player.power === 'big') player.grow('fire');
        else audio.sfx('powerup');
        break;
      case 'crisp':
        player.giveStar();
        audio.sfx('powerup');
        break;
      case 'lucky':
        addLife();
        audio.sfx('oneup');
        s.popup(this.x, this.y - 16, '1UP');
        this.destroy();
        return;
    }
    addScore(SCORE.powerup);
    s.popup(this.x, this.y - 16, SCORE.powerup);
    this.destroy();
  }
}
