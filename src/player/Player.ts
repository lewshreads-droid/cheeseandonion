import Phaser from 'phaser';
import { PHYSICS, PLAYER } from '../config';
import { audio } from '../audio/AudioEngine';
import { cheeseKey, CheeseFrame, STAR_PALS } from '../gfx/textures';
import { Controls } from '../input';
import { diff, G, Power } from '../state';
import type GameScene from '../scenes/GameScene';
import type { Platform } from '../world/Platform';

/**
 * normal   — under player control
 * auto     — walks right on its own (after the flagpole)
 * idle     — physics on, no input (e.g. while the bridge collapses)
 * scripted — physics off, moved by tweens (pole slide, graters)
 * frozen   — grow/shrink freeze
 * dead     — death animation
 */
export type PlayerMode = 'normal' | 'auto' | 'idle' | 'scripted' | 'frozen' | 'dead';

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  declare scene: GameScene;

  mode: PlayerMode = 'normal';
  power: Power;
  facing: 1 | -1 = 1;
  invulnUntil = 0;
  starUntil = 0;
  kickGraceUntil = 0;
  stompChain = 0;
  starChain = 0;
  platform: Platform | null = null;
  framePinned: CheeseFrame | null = null; // scripted sequences can force a frame

  private crouching = false;
  private skidding = false;
  private jumping = false;
  private lastGround = 0;
  private jumpBufferUntil = 0;
  private airCap: number = PLAYER.walkMax;
  private walkAcc = 0;
  private throwUntil = 0;
  private nextBlink = 2000;
  private nextDust = 0;
  private transformUntil = 0;
  private transformFrom: Power = 'small';
  private deathT = 0;
  private deathVy = 0;
  private deathPop = true;

  constructor(scene: GameScene, x: number, y: number, power: Power) {
    super(scene, x, y, cheeseKey(power !== 'small', 'normal'), 'idle');
    this.power = power;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(10);
    this.body.setMaxVelocity(400, PHYSICS.maxFall);
    this.body.setCollideWorldBounds(true);
    this.applyBody();
  }

  get big(): boolean {
    return this.power !== 'small';
  }

  get isStar(): boolean {
    return this.scene.now < this.starUntil;
  }

  get alive(): boolean {
    return this.mode !== 'dead';
  }

  get onGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  /* ---------------------------------------------------------------- power */

  private applyBody(): void {
    const big = this.big;
    this.setTexture(cheeseKey(big, 'normal'), this.crouching && big ? 'crouch' : 'idle');
    if (!big) this.body.setSize(12, 14, false).setOffset(2, 2);
    else if (this.crouching) this.body.setSize(14, 16, false).setOffset(5, 16);
    else this.body.setSize(14, 28, false).setOffset(5, 4);
  }

  setPower(p: Power, animate = true): void {
    const from = this.power;
    this.power = p;
    G.power = p;
    if (p === 'small') this.crouching = false;
    this.applyBody();
    if (animate && from !== p) {
      this.transformFrom = from;
      this.transformUntil = this.scene.now + PLAYER.transformMs;
      this.scene.freeze(PLAYER.transformMs);
    }
  }

  grow(to: Power): void {
    audio.sfx('powerup');
    this.setPower(to);
  }

  hurt(): void {
    const now = this.scene.now;
    if (this.mode !== 'normal' || this.isStar || now < this.invulnUntil) return;
    if (this.power === 'small') {
      this.scene.killPlayer(false);
      return;
    }
    audio.sfx('shrink');
    this.invulnUntil = now + PLAYER.transformMs + diff().hurtInvulnMs;
    this.setPower('small');
  }

  giveStar(): void {
    this.starUntil = this.scene.now + PLAYER.starMs;
    this.starChain = 0;
  }

  /** Bounce after a stomp; holding jump gives a higher bounce. */
  bounce(held: boolean): void {
    this.body.setVelocityY(-(held ? PLAYER.stompBounceHeld : PLAYER.stompBounce));
    this.jumping = true;
  }

  die(pit: boolean): void {
    this.mode = 'dead';
    this.deathT = 0;
    this.deathVy = 0;
    this.deathPop = !pit;
    this.body.setEnable(false);
    this.setDepth(30);
    this.setAlpha(1);
    this.setTexture(cheeseKey(this.big, 'normal'), 'dead');
  }

  /* --------------------------------------------------------------- update */

  update(time: number, dt: number, c: Controls | null): void {
    switch (this.mode) {
      case 'dead': this.updateDeath(dt); return;
      case 'scripted':
      case 'frozen': this.updateVisual(time, dt); return;
    }
    const b = this.body;
    const onGround = this.onGround;
    if (onGround) {
      this.lastGround = time;
      if (!this.jumping) this.stompChain = 0;
      this.airCap = Math.max(PLAYER.walkMax, Math.abs(b.velocity.x));
    }

    const auto = this.mode === 'auto';
    const input = this.mode === 'normal' && c;
    let dir = auto ? 1 : input ? (c.held('right') ? 1 : 0) - (c.held('left') ? 1 : 0) : 0;
    const run = !!input && c.held('run');

    // crouch (big only); stay crouched under a low ceiling
    const wantCrouch = !!input && this.big && c.held('down') && (onGround || this.crouching);
    if (wantCrouch !== this.crouching) {
      if (wantCrouch || this.canStand()) {
        this.crouching = wantCrouch;
        this.applyBody();
      }
    }
    // holding down = planted; a crouch forced by a low ceiling can still shuffle out
    if (this.crouching && onGround && wantCrouch) dir = 0;

    // horizontal
    let vx = b.velocity.x;
    const cap = auto ? PLAYER.walkMax * 0.8 : onGround ? (run ? PLAYER.runMax : PLAYER.walkMax) : this.airCap;
    this.skidding = false;
    if (dir !== 0) {
      if (onGround && Math.sign(vx) === -dir && Math.abs(vx) > PLAYER.skidMinSpeed) {
        vx += dir * PLAYER.skidDecel * dt;
        if (!this.skidding && time > this.nextDust) {
          this.scene.dust(this.x - dir * 4, this.y);
          if (this.nextDust < time - 200) audio.sfx('skid');
          this.nextDust = time + 90;
        }
        this.skidding = true;
      } else {
        const accel = (run ? PLAYER.runAccel : PLAYER.walkAccel) * (onGround ? 1 : PLAYER.airAccelFactor);
        if (dir * vx < cap) vx = Math.min(cap, dir * vx + accel * dt) * dir;
        else vx -= dir * Math.min(dir * vx - cap, PLAYER.overSpeedDecel * dt);
      }
      if (onGround) this.facing = dir as 1 | -1;
    } else if (onGround) {
      const dec = PLAYER.releaseDecel * dt * (this.crouching ? 0.6 : 1);
      vx = Math.abs(vx) <= dec ? 0 : vx - Math.sign(vx) * dec;
    }
    b.setVelocityX(vx);

    // jump (buffered + coyote time)
    if (input && c.pressed('jump')) this.jumpBufferUntil = time + PLAYER.jumpBufferMs;
    const canJump = onGround || (time - this.lastGround < PLAYER.coyoteMs && !this.jumping);
    if (time < this.jumpBufferUntil && canJump) {
      const frac = Math.min(1, Math.abs(vx) / PLAYER.runMax);
      b.setVelocityY(-(PLAYER.jumpVel + (PLAYER.runJumpVel - PLAYER.jumpVel) * frac));
      this.jumping = true;
      this.jumpBufferUntil = 0;
      this.lastGround = -1e9;
      this.airCap = Math.max(PLAYER.walkMax, Math.abs(vx));
      audio.sfx(this.big ? 'bigjump' : 'jump');
    }

    // ride a platform that is moving down
    if (this.platform && !this.jumping && this.platform.body.velocity.y > 0) b.setVelocityY(this.platform.body.velocity.y);
    this.platform = null;

    // variable jump height: lighter gravity while rising with jump held
    const rising = b.velocity.y < 0;
    if (!rising) this.jumping = false;
    const hold = rising && this.jumping && (auto || (!!input && c.held('jump')));
    b.setGravityY(hold ? PHYSICS.jumpHoldGravity - PHYSICS.gravity : 0);

    // throw a pickled onion
    if (input && this.power === 'fire' && c.pressed('run') && !this.crouching) {
      if (this.scene.throwPickledOnion(this)) this.throwUntil = time + 160;
    }

    this.updateVisual(time, dt);
  }

  private canStand(): boolean {
    const layer = this.scene.layer;
    const top = this.body.bottom - 28;
    for (const x of [this.body.left + 1, this.body.right - 1]) {
      const t = layer.getTileAtWorldXY(x, top + 1);
      if (t && t.collides) return false;
    }
    return true;
  }

  private updateVisual(time: number, dt: number): void {
    // which size to show (flickers between sizes while transforming)
    let big = this.big;
    if (time < this.transformUntil) {
      const phase = Math.floor((this.transformUntil - time) / 80) % 2 === 0;
      big = phase ? this.big : this.transformFrom !== 'small';
    }
    let pal = big && this.power === 'fire' ? 'fire' : 'normal';
    if (big && this.transformFrom === 'big' && this.power === 'fire' && time < this.transformUntil)
      pal = Math.floor(time / 80) % 2 ? 'fire' : 'normal';
    if (this.isStar) {
      const remaining = this.starUntil - time;
      const speed = remaining < 2000 ? 140 : 60;
      pal = STAR_PALS[Math.floor(time / speed) % STAR_PALS.length];
    }

    const frame = this.framePinned ?? this.pickFrame(time, dt);
    const key = cheeseKey(big, pal);
    if (this.texture.key !== key) this.setTexture(key, frame);
    else if (this.frame.name !== frame) this.setFrame(frame);
    this.setFlipX(this.facing < 0);

    // post-hit invulnerability flicker
    this.setAlpha(time < this.invulnUntil && time > this.transformUntil && Math.floor(time / 50) % 2 ? 0.15 : 1);
  }

  private pickFrame(time: number, dt: number): CheeseFrame {
    if (this.mode === 'frozen' || this.mode === 'scripted') return this.frame.name as CheeseFrame;
    if (this.crouching) return 'crouch';
    const b = this.body;
    const airborne = time - this.lastGround > 70;
    if (airborne) return b.velocity.y < 0 ? 'jump' : 'fall';
    if (time < this.throwUntil) return 'throw';
    if (this.skidding) return 'skid';
    const speed = Math.abs(b.velocity.x);
    if (speed > 4) {
      if (speed > PLAYER.walkMax + 20) return Math.floor(time / 50) % 2 ? 'run0' : 'run1';
      this.walkAcc += speed * dt;
      const walk: CheeseFrame[] = ['walk0', 'walk1', 'walk2', 'walk3'];
      return walk[Math.floor(this.walkAcc / 5) % 4];
    }
    if (time > this.nextBlink) {
      if (time > this.nextBlink + 130) this.nextBlink = time + 1800 + Math.random() * 2600;
      return 'blink';
    }
    return 'idle';
  }

  private updateDeath(dt: number): void {
    this.deathT += dt;
    if (!this.deathPop) return;
    if (this.deathT < 0.5) return;
    if (this.deathVy === 0) this.deathVy = -330;
    this.deathVy += 1000 * dt;
    this.y += this.deathVy * dt;
  }
}
