import Phaser from 'phaser';
import { ENEMY, GAME_HEIGHT, GAME_WIDTH, PLAYER, SCORE, TILE, TIMING } from '../config';
import { audio } from '../audio/AudioEngine';
import { THEME_COLS } from '../gfx/textures';
import { Controls } from '../input';
import { addLife, addOnion, addScore, chainScore, diff, G, startPower } from '../state';
import { LEVELS, LevelDef, SectionDef } from '../world/LevelData';
import { BuiltLevel, buildLevel, ContentKind, decorate, Spawn } from '../world/LevelBuilder';
import { isLava, isSalt, T, Theme } from '../world/tiles';
import { Platform } from '../world/Platform';
import { FireBar } from '../world/FireBar';
import { Player } from '../player/Player';
import { Enemy } from '../enemies/Enemy';
import { Grunt } from '../enemies/Grunt';
import { ShellBack } from '../enemies/ShellBack';
import { Hopper } from '../enemies/Hopper';
import { Flinger } from '../enemies/Flinger';
import { Overlord } from '../enemies/Overlord';
import { EnemyShot } from '../enemies/EnemyShot';
import { Onion } from '../items/Onion';
import { PowerUp } from '../items/PowerUp';
import { PickledOnion } from '../items/PickledOnion';
import * as fx from '../fx/effects';

type Mode = 'play' | 'dying' | 'flag' | 'tally' | 'warp' | 'lever';

interface GameArgs {
  section?: string;
  spawn?: { x: number; y: number };
  emerge?: boolean;
  fresh?: boolean;
}

type Tile = Phaser.Tilemaps.Tile;

export default class GameScene extends Phaser.Scene {
  level!: LevelDef;
  sectionName = 'main';
  section!: SectionDef;
  theme!: Theme;
  built!: BuiltLevel;
  layer!: Phaser.Tilemaps.TilemapLayer;
  player!: Player;
  controls!: Controls;
  enemies!: Phaser.Physics.Arcade.Group;
  items!: Phaser.Physics.Arcade.Group;
  onions!: Phaser.Physics.Arcade.Group;
  playerShots!: Phaser.Physics.Arcade.Group;
  enemyShots!: Phaser.Physics.Arcade.Group;
  /** Gameplay clock in ms. Only advances while the scene runs, so pausing doesn't eat timers. */
  now = 0;

  private args: GameArgs = {};
  private mode: Mode = 'play';
  private platformList: Platform[] = [];
  private firebars: FireBar[] = [];
  private spawnIdx = 0;
  private frozen = false;
  private freezeUntil = 0;
  private headHits: Tile[] = [];
  private bumping = new Set<string>();
  private animPhase = 0;
  private music = '';
  private hurried = false;
  private debugOn = false;
  private pole: { x: number; baseY: number; topY: number; flag: Phaser.GameObjects.Image } | null = null;
  private hutDoorX: number | null = null;
  private lever: Phaser.GameObjects.Image | null = null;
  private boss: Overlord | null = null;
  private autoWalkSince = 0;

  constructor() {
    super('Game');
  }

  init(args: GameArgs): void {
    // Phaser reuses the scene instance on restart, so reset all per-run state here.
    this.args = args ?? {};
    this.mode = 'play';
    this.platformList = [];
    this.firebars = [];
    this.spawnIdx = 0;
    this.frozen = false;
    this.headHits = [];
    this.bumping.clear();
    this.hurried = false;
    this.pole = null;
    this.hutDoorX = null;
    this.lever = null;
    this.boss = null;
    this.now = 0;
    this.debugOn = false;
  }

  create(): void {
    const a = this.args;
    this.level = LEVELS[G.levelIndex];
    this.sectionName = a.section && this.level.sections[a.section] ? a.section : 'main';
    this.section = this.level.sections[this.sectionName];
    this.theme = this.section.theme;
    if (a.fresh) G.time = Math.round(this.level.time * diff().timeMul);

    this.cameras.main.setBackgroundColor(THEME_COLS[this.theme].bg);
    this.built = buildLevel(this, this.section);
    this.layer = this.built.layer;
    decorate(this, this.section, hashString(this.level.id + this.sectionName));

    const W = this.built.widthPx;
    this.physics.world.setBounds(0, 0, W, GAME_HEIGHT + 200, true, true, false, false);

    this.enemies = this.physics.add.group();
    this.items = this.physics.add.group();
    this.onions = this.physics.add.group();
    this.playerShots = this.physics.add.group();
    this.enemyShots = this.physics.add.group();

    this.createProps();
    this.createPlayer();
    this.createColliders();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, GAME_HEIGHT);
    cam.scrollX = Phaser.Math.Clamp(this.player.x - GAME_WIDTH * 0.42, 0, Math.max(0, W - GAME_WIDTH));
    cam.fadeIn(200);

    this.controls = new Controls(this);
    this.controls.latch();

    if (!this.scene.isActive('HUD')) this.scene.launch('HUD');
    this.scene.bringToTop('HUD');

    this.time.addEvent({ delay: TIMING.timerTickMs, loop: true, callback: () => this.tickTimer() });
    this.time.addEvent({ delay: 150, loop: true, callback: () => this.animateTiles() });

    this.music = this.sectionName === 'main' ? this.level.music : this.theme;
    audio.playMusic(this.music);
    if (G.time <= TIMING.hurryAt) {
      this.hurried = true;
      audio.setTempo(1.3);
    }
  }

  /* ------------------------------------------------------------ creation */

  private createProps(): void {
    const b = this.built;
    for (const o of b.onions) new Onion(this, o.x, o.y);
    for (const p of b.platforms) this.platformList.push(new Platform(this, p.x, p.y, p.w, p.vertical));
    for (const f of b.firebars) this.firebars.push(new FireBar(this, f.x, f.y, f.dir));
    if (b.pole) {
      const { x, baseY, topY } = b.pole;
      this.add.tileSprite(x, topY, 8, baseY - topY, 'breadstick').setOrigin(0.5, 0).setDepth(2);
      this.add.image(x, topY - 3, 'breadstick-tip').setDepth(2);
      const flag = this.add.image(x - 9, topY + 9, 'flag').setDepth(2);
      this.pole = { x, baseY, topY, flag };
    }
    if (b.hut) {
      this.add.image(b.hut.x, b.hut.y, 'hut').setOrigin(0, 1).setDepth(-2);
      this.hutDoorX = b.hut.x + 40;
    }
    if (b.lever) this.lever = this.add.image(b.lever.x, b.lever.y, 'lever', 0).setOrigin(0.5, 1).setDepth(2);
  }

  private createPlayer(): void {
    const a = this.args;
    const lv = this.level;
    let tx: number, ty: number;
    if (a.spawn) ({ x: tx, y: ty } = a.spawn);
    else if (this.sectionName === 'main' && G.checkpoint && lv.checkpoint) ({ x: tx, y: ty } = lv.checkpoint);
    else if (this.built.start) ({ x: tx, y: ty } = this.built.start);
    else [tx, ty] = [2, 12];

    const ent = a.emerge ? this.built.entrances.find((e) => (e.x === tx || e.x + 1 === tx) && e.y === ty + 1) : undefined;
    const px = ent ? ent.x * TILE + TILE : tx * TILE + TILE / 2;
    const py = (ty + 1) * TILE;
    this.player = new Player(this, px, py, G.power);

    if (ent) {
      // rise up out of the grater
      const p = this.player;
      p.mode = 'scripted';
      p.body.setEnable(false);
      p.setDepth(-1);
      p.y = py + p.height;
      audio.sfx('grater');
      this.tweens.add({
        targets: p, y: py, duration: 900, delay: 250,
        onComplete: () => {
          p.setDepth(10);
          p.body.setEnable(true);
          p.body.reset(p.x, p.y);
          p.mode = 'normal';
        },
      });
    }
  }

  private createColliders(): void {
    const P = this.player;
    const ph = this.physics;
    ph.add.collider(P, this.layer, (_p, t) => this.onPlayerTile(t as Tile), () => P.alive);
    ph.add.collider(P, this.platformList, (_p, pl) => {
      if (P.body.touching.down) P.platform = pl as unknown as Platform;
    });
    ph.add.collider(this.enemies, this.layer, undefined, (e) => !(e as Enemy).dead);
    ph.add.collider(this.items, this.layer);
    ph.add.collider(this.playerShots, this.layer);
    ph.add.overlap(P, this.enemies, (_p, e) => this.onPlayerEnemy(e as Enemy), (_p, e) => {
      const en = e as Enemy;
      return P.mode === 'normal' && !en.dead && this.now > en.ignorePlayerUntil;
    });
    ph.add.overlap(P, this.items, (_p, i) => (i as PowerUp).collect(P), (_p, i) => !(i as PowerUp).emerging && P.mode === 'normal');
    ph.add.overlap(P, this.onions, (_p, o) => this.collectOnion(o as Onion), () => P.alive);
    ph.add.overlap(this.playerShots, this.enemies, (s, e) => this.onShotEnemy(s as PickledOnion, e as Enemy), (_s, e) => !(e as Enemy).dead);
    ph.add.overlap(P, this.enemyShots, (_p, s) => this.onEnemyShot(s as EnemyShot), () => P.mode === 'normal');
    ph.add.overlap(this.enemies, this.enemies, (a, b) => this.onEnemyEnemy(a as Enemy, b as Enemy), (a, b) => !(a as Enemy).dead && !(b as Enemy).dead);
  }

  /* -------------------------------------------------------------- update */

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.now += Math.min(delta, 50);
    const now = this.now;
    this.controls.update();
    this.syncDebug();

    if (this.frozen) {
      this.player.update(now, dt, null);
      if (now >= this.freezeUntil) {
        this.frozen = false;
        this.physics.resume();
        if (this.player.mode === 'frozen') this.player.mode = 'normal';
      }
      return;
    }

    switch (this.mode) {
      case 'play':
        this.player.update(now, dt, this.controls);
        this.processHeadHits();
        this.checkHiddenBlocks();
        this.spawnEnemies();
        this.updateEntities(now, dt);
        this.checkHazards();
        this.checkGraters();
        this.checkGoals();
        this.checkCheckpoint();
        this.updateStarMusic();
        break;
      case 'flag':
        this.player.update(now, dt, null);
        this.updateEntities(now, dt);
        this.checkHutDoor();
        break;
      case 'lever':
        this.player.update(now, dt, null);
        this.updateEntities(now, dt);
        break;
      default:
        this.player.update(now, dt, null);
    }
    this.updateCamera();
  }

  private updateEntities(now: number, dt: number): void {
    const cam = this.cameras.main;
    const left = cam.scrollX - 80, right = cam.scrollX + GAME_WIDTH + 80;
    for (const e of [...this.enemies.getChildren()] as Enemy[]) {
      if (e.y > GAME_HEIGHT + 64 || e.x < left) {
        e.destroy();
        continue;
      }
      if (!e.dead) e.tick(now, dt);
    }
    for (const i of [...this.items.getChildren()] as PowerUp[]) {
      if (i.y > GAME_HEIGHT + 32) i.destroy();
      else i.tick(now);
    }
    for (const o of this.onions.getChildren() as Onion[]) o.tick(now);
    for (const s of [...this.playerShots.getChildren()] as PickledOnion[]) {
      if (s.y > GAME_HEIGHT + 16 || s.x < left + 64 || s.x > right - 64) s.destroy();
      else s.tick(now, dt);
    }
    for (const s of [...this.enemyShots.getChildren()] as EnemyShot[]) {
      if (s.y > GAME_HEIGHT + 16 || s.x < left || s.x > right) s.destroy();
      else s.tick(now);
    }
    for (const p of this.platformList) p.tick();
    for (const f of this.firebars) f.update(now, dt);
  }

  private updateCamera(): void {
    const cam = this.cameras.main;
    const p = this.player;
    if (this.mode === 'dying') return;
    const b = p.body;
    const px = b.enable ? b.center.x : p.x;
    const maxScroll = Math.max(0, this.built.widthPx - GAME_WIDTH);
    const target = Phaser.Math.Clamp(px - GAME_WIDTH * 0.42, 0, maxScroll);
    if (target > cam.scrollX) cam.scrollX = target; // never scrolls back left
    if (b.enable && b.left < cam.scrollX) {
      p.x += cam.scrollX - b.left;
      if (b.velocity.x < 0) b.setVelocityX(0);
    }
  }

  private syncDebug(): void {
    if (G.debug === this.debugOn) return;
    this.debugOn = G.debug;
    const w = this.physics.world;
    if (G.debug && !w.debugGraphic) w.createDebugGraphic();
    w.drawDebug = G.debug;
    if (w.debugGraphic) {
      w.debugGraphic.clear();
      w.debugGraphic.setVisible(G.debug).setDepth(100);
    }
  }

  /* -------------------------------------------------------------- spawns */

  private spawnEnemies(): void {
    const cam = this.cameras.main;
    const edge = cam.scrollX + GAME_WIDTH + ENEMY.activateMargin;
    const spawns = this.built.spawns;
    while (this.spawnIdx < spawns.length && spawns[this.spawnIdx].x <= edge) {
      const s = spawns[this.spawnIdx++];
      if (s.x < cam.scrollX - 16) continue;
      const e = this.makeEnemy(s);
      this.enemies.add(e);
    }
  }

  private makeEnemy(s: Spawn): Enemy {
    switch (s.kind) {
      case 'k': return new ShellBack(this, s.x, s.y);
      case 'j': return new Hopper(this, s.x, s.y);
      case 'f': return new Flinger(this, s.x, s.y);
      case 'W':
        this.boss = new Overlord(this, s.x, s.y);
        this.music = 'boss';
        if (!this.player.isStar) audio.playMusic('boss');
        if (this.hurried) audio.setTempo(1.3);
        return this.boss;
      default: return new Grunt(this, s.x, s.y);
    }
  }

  /* ------------------------------------------------------------- blocks */

  private onPlayerTile(tile: Tile): void {
    const b = this.player.body;
    const bottom = tile.pixelY + TILE;
    if (b.blocked.up && Math.abs(bottom - b.top) <= 3) this.headHits.push(tile);
  }

  private processHeadHits(): void {
    if (!this.headHits.length) return;
    const cx = this.player.body.center.x;
    let best = this.headHits[0];
    for (const t of this.headHits) if (Math.abs(t.pixelX + 8 - cx) < Math.abs(best.pixelX + 8 - cx)) best = t;
    this.headHits.length = 0;
    this.hitBlock(best);
  }

  private checkHiddenBlocks(): void {
    const b = this.player.body;
    if (!b.enable || b.velocity.y >= 0 || this.built.hidden.size === 0) return;
    const ty = Math.floor(b.top / TILE);
    for (const x of [b.center.x, b.left + 2, b.right - 2]) {
      const tx = Math.floor(x / TILE);
      const key = `${tx},${ty}`;
      const content = this.built.hidden.get(key);
      if (!content || this.layer.getTileAt(tx, ty)) continue;
      const bottom = (ty + 1) * TILE;
      if (b.top < bottom && b.top > bottom - 10) {
        this.built.hidden.delete(key);
        this.built.contents.set(key, content);
        const tile = this.layer.putTileAt(T.USED, tx, ty);
        this.player.y += bottom - b.top;
        b.setVelocityY(0);
        this.hitBlock(tile);
        return;
      }
    }
  }

  private hitBlock(tile: Tile): void {
    const key = `${tile.x},${tile.y}`;
    if (this.bumping.has(key)) return;
    const content = this.built.contents.get(key);
    this.bumpAbove(tile);
    if (content) {
      if (content.kind === 'multi') {
        if (--content.count <= 0) {
          this.built.contents.delete(key);
          tile.index = T.USED;
        }
        this.dispense('onion', tile);
      } else {
        this.built.contents.delete(key);
        tile.index = T.USED;
        this.dispense(content.kind, tile);
      }
      this.bump(tile);
      return;
    }
    if (tile.index === T.BRICK) {
      if (this.player.big) {
        this.breakBrick(tile);
        return;
      }
      this.bump(tile);
    } else if (isSalt(tile.index)) {
      tile.index = T.USED;
      this.dispense('onion', tile);
      this.bump(tile);
      return;
    }
    audio.sfx('bump');
  }

  private dispense(kind: ContentKind, tile: Tile): void {
    const cx = tile.pixelX + 8, top = tile.pixelY;
    switch (kind) {
      case 'onion':
      case 'multi':
        audio.sfx('onion');
        addOnion();
        addScore(SCORE.onion);
        fx.blockOnion(this, cx, top - 8, () => fx.popup(this, cx, top - 12, SCORE.onion));
        break;
      case 'power': new PowerUp(this, tile.x, tile.y, this.player.power === 'small' ? 'cracker' : 'chilli'); break;
      case 'crisp': new PowerUp(this, tile.x, tile.y, 'crisp'); break;
      case 'life': new PowerUp(this, tile.x, tile.y, 'lucky'); break;
    }
  }

  /** Visual bump: hide the tile and bounce a copy of it. Collision is unaffected. */
  private bump(tile: Tile): void {
    const key = `${tile.x},${tile.y}`;
    this.bumping.add(key);
    const img = this.add.image(tile.pixelX + 8, tile.pixelY + 8, `tiles-${this.theme}`, tile.index).setDepth(1);
    tile.setVisible(false);
    this.tweens.add({
      targets: img, y: img.y - 6, duration: 70, yoyo: true, ease: 'Quad.out',
      onComplete: () => {
        tile.setVisible(true);
        img.destroy();
        this.bumping.delete(key);
      },
    });
  }

  private breakBrick(tile: Tile): void {
    this.layer.removeTileAt(tile.x, tile.y);
    fx.debris(this, `debris-${this.theme}`, tile.pixelX + 8, tile.pixelY + 8);
    addScore(SCORE.brick);
    audio.sfx('break');
  }

  /** Anything standing on a bumped block gets knocked about. */
  private bumpAbove(tile: Tile): void {
    const left = tile.pixelX, right = left + TILE, top = tile.pixelY;
    for (const e of [...this.enemies.getChildren()] as Enemy[]) {
      if (e.dead || e instanceof Overlord) continue;
      const eb = e.body;
      if (Math.abs(eb.bottom - top) < 4 && eb.right > left && eb.left < right) {
        e.knockOut(e.x < left + 8 ? -1 : 1);
        this.awardPoints(e.x, e.y - 16, 100);
        audio.sfx('kick');
      }
    }
    for (const i of this.items.getChildren() as PowerUp[]) {
      const ib = i.body;
      if (ib && Math.abs(ib.bottom - top) < 4 && ib.right > left && ib.left < right) i.hop(left + 8);
    }
    for (const o of [...this.onions.getChildren()] as Onion[]) {
      if (Math.abs(o.x - (left + 8)) < 8 && o.y < top && o.y > top - TILE) this.collectOnion(o);
    }
  }

  /* -------------------------------------------------------- interactions */

  private onPlayerEnemy(e: Enemy): void {
    const p = this.player;
    if (p.isStar) {
      if (e instanceof Overlord) return;
      e.knockOut(p.x < e.x ? 1 : -1);
      this.awardChain(e.x, e.y - 16, p.starChain++);
      audio.sfx('kick');
      return;
    }
    const pb = p.body, eb = e.body;
    const stomp = e.stompable && pb.velocity.y > 0 && pb.bottom - eb.top <= 10;
    if (stomp && e.onStomp(p)) {
      e.ignorePlayerUntil = this.now + 120;
      p.bounce(this.controls.held('jump'));
      p.y -= pb.bottom - eb.top; // lift clear so we don't sink into it this frame
      audio.sfx('stomp');
      this.awardChain(e.x, e.y - 16, p.stompChain++);
    } else {
      e.onTouch(p);
    }
  }

  private onShotEnemy(s: PickledOnion, e: Enemy): void {
    if (!s.active) return;
    if (e instanceof Overlord) e.hit();
    else if (!e.fireproof) {
      e.knockOut(s.body.velocity.x > 0 ? 1 : -1);
      this.awardPoints(e.x, e.y - 16, SCORE.projectileKill);
      audio.sfx('kick');
    }
    s.pop();
  }

  private onEnemyShot(s: EnemyShot): void {
    if (this.player.isStar) s.destroy();
    else this.player.hurt();
  }

  private onEnemyEnemy(a: Enemy, b: Enemy): void {
    if (a.shellMoving && b.shellMoving) {
      a.knockOut(-1);
      b.knockOut(1);
      audio.sfx('kick');
      return;
    }
    const shell = a.shellMoving ? a : b.shellMoving ? b : null;
    if (shell) {
      const other = shell === a ? b : a;
      if (other.shellproof) return;
      other.knockOut(shell.dir);
      this.awardChain(other.x, other.y - 16, shell.shellChain++);
      audio.sfx('kick');
      return;
    }
    if (a.walker && b.walker) {
      const s = a.x < b.x ? -1 : 1;
      a.dir = s;
      b.dir = -s as 1 | -1;
    }
  }

  private collectOnion(o: Onion): void {
    if (!o.active) return;
    fx.sparkle(this, o.x, o.y);
    o.destroy();
    addOnion();
    addScore(SCORE.onion);
    audio.sfx('onion');
  }

  /* ------------------------------------------------------------- hazards */

  private checkHazards(): void {
    const p = this.player;
    const b = p.body;
    if (!b.enable || !p.alive) return;
    if (b.top > GAME_HEIGHT + 8) {
      this.killPlayer(true);
      return;
    }
    const t = this.layer.getTileAtWorldXY(b.center.x, b.bottom - 3);
    if (t && isLava(t.index)) {
      this.killPlayer(false);
      return;
    }
    if (this.firebars.length) {
      const r = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
      if (this.firebars.some((f) => f.hits(r))) p.hurt();
    }
  }

  private checkGraters(): void {
    const p = this.player;
    if (p.mode !== 'normal' || !this.controls.held('down') || !p.onGround) return;
    const b = p.body;
    for (const e of this.built.entrances) {
      const left = e.x * TILE, top = e.y * TILE;
      if (Math.abs(b.bottom - top) <= 2 && b.center.x > left + 6 && b.center.x < left + 26) {
        this.enterGrater(e);
        return;
      }
    }
  }

  private enterGrater(e: { x: number; y: number }): void {
    const warp = this.level.warps.find(
      (w) => w.fromSection === this.sectionName && (w.fromCol === e.x || w.fromCol === e.x + 1),
    );
    if (!warp) return; // decorative grater
    this.mode = 'warp';
    const p = this.player;
    p.mode = 'scripted';
    p.body.setEnable(false);
    p.setDepth(-1);
    p.x = e.x * TILE + TILE;
    audio.stopMusic();
    audio.sfx('grater');
    this.tweens.add({
      targets: p, y: p.y + p.height, duration: 900,
      onComplete: () => {
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
          this.scene.restart({ section: warp.toSection, spawn: { x: warp.toX, y: warp.toY }, emerge: true }),
        );
      },
    });
  }

  private checkCheckpoint(): void {
    const cp = this.level.checkpoint;
    if (cp && diff().checkpoints && !G.checkpoint && this.sectionName === 'main' && this.player.x >= cp.x * TILE) G.checkpoint = true;
  }

  private tickTimer(): void {
    if (this.mode !== 'play' || this.frozen || !this.player.alive) return;
    G.time = Math.max(0, G.time - 1);
    if (G.time === TIMING.hurryAt && !this.hurried) {
      this.hurried = true;
      audio.sfx('hurry');
      audio.setTempo(1.3);
    }
    if (G.time === 0) this.killPlayer(false);
  }

  private updateStarMusic(): void {
    const star = this.player.isStar;
    if (star && audio.currentSong !== 'star') audio.playMusic('star');
    else if (!star && audio.currentSong === 'star') {
      audio.playMusic(this.music);
      if (this.hurried) audio.setTempo(1.3);
    }
  }

  private animateTiles(): void {
    this.animPhase++;
    const salt = [T.SALT0, T.SALT0, T.SALT0, T.SALT1, T.SALT2, T.SALT1];
    const f = salt[this.animPhase % salt.length];
    for (const t of this.built.saltTiles) if (isSalt(t.index)) t.index = f;
    if (this.animPhase % 2 === 0) {
      const l = (this.animPhase / 2) % 2 ? T.LAVA_TOP1 : T.LAVA_TOP0;
      for (const t of this.built.lavaTops) t.index = l;
    }
  }

  /* --------------------------------------------------------- level ends */

  private checkGoals(): void {
    const p = this.player;
    const b = p.body;
    if (p.mode !== 'normal') return;
    if (this.pole && b.right >= this.pole.x - 8 && b.bottom < this.pole.baseY + 14) {
      this.startFlag();
      return;
    }
    if (this.lever) {
      const lx = this.lever.x, ly = this.lever.y;
      if (b.right > lx - 6 && b.left < lx + 6 && b.bottom > ly - 26 && b.top < ly) this.pullLever();
    }
  }

  private startFlag(): void {
    const pole = this.pole!;
    const p = this.player;
    this.mode = 'flag';
    const h = Phaser.Math.Clamp((pole.baseY - p.body.bottom) / (pole.baseY - pole.topY), 0, 1);
    const pts = h > 0.92 ? 5000 : h > 0.7 ? 2000 : h > 0.45 ? 800 : h > 0.2 ? 400 : 100;
    addScore(pts);
    fx.popup(this, pole.x + 16, p.body.bottom, pts);
    audio.stopMusic();
    audio.sfx('flagpole');

    p.mode = 'scripted';
    p.body.setEnable(false);
    p.framePinned = 'pole';
    p.facing = 1;
    p.x = pole.x - (p.big ? 8 : 6);
    const slideMs = Math.max(200, ((pole.baseY - p.y) / 150) * 1000);
    this.tweens.add({ targets: p, y: pole.baseY, duration: slideMs });
    this.tweens.add({ targets: pole.flag, y: pole.baseY - 9, duration: 1000 });
    this.time.delayedCall(Math.max(slideMs, 1000) + 150, () => {
      p.facing = -1;
      p.x = pole.x + (p.big ? 8 : 6);
      this.time.delayedCall(380, () => {
        p.framePinned = null;
        p.facing = 1;
        p.body.setEnable(true);
        p.body.reset(p.x, p.y);
        p.mode = 'auto';
        this.autoWalkSince = this.now;
        audio.playMusic('clear');
      });
    });
  }

  private checkHutDoor(): void {
    const p = this.player;
    if (p.mode !== 'auto') return;
    const atDoor = this.hutDoorX !== null ? p.x >= this.hutDoorX : this.now - this.autoWalkSince > 2500;
    if (!atDoor) return;
    p.mode = 'scripted';
    p.body.setEnable(false);
    p.setVisible(false);
    this.startTally(() => this.levelComplete());
  }

  private pullLever(): void {
    this.mode = 'lever';
    const p = this.player;
    p.mode = 'idle';
    audio.stopMusic();
    audio.sfx('lever');
    this.lever!.setFrame(1);
    for (const s of [...this.enemyShots.getChildren()]) s.destroy();
    const boss = this.boss && !this.boss.dead ? this.boss : null;
    if (boss) boss.panic = true;

    const tiles = [...this.built.bridge].sort((a, b) => b.x - a.x);
    let i = 0;
    if (tiles.length) {
      this.time.addEvent({
        delay: 70, repeat: tiles.length - 1,
        callback: () => {
          const t = tiles[i++];
          this.layer.removeTileAt(t.x, t.y);
          audio.sfx('crumble');
          // the plank under the Overlord goes: down he goes, and the points are ours
          if (boss && !boss.dead && Math.abs(t.pixelX + 8 - boss.x) < 20) boss.defeat();
        },
      });
    }
    const collapseMs = tiles.length * 70 + 300;
    this.time.delayedCall(collapseMs, () => boss?.defeat()); // fallback if he wasn't over the bridge
    this.time.delayedCall(collapseMs + 2000, () => {
      audio.playMusic('win');
      this.startTally(() => this.levelComplete());
    });
  }

  private startTally(done: () => void): void {
    this.mode = 'tally';
    let n = 0;
    const ev = this.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        if (G.time > 0) {
          const step = Math.min(G.time, 2);
          G.time -= step;
          addScore(step * SCORE.timeUnit);
          if (n++ % 3 === 0) audio.sfx('tick');
        } else {
          ev.remove();
          this.time.delayedCall(1500, done);
        }
      },
    });
  }

  private levelComplete(): void {
    G.levelIndex++;
    G.checkpoint = false;
    if (G.levelIndex >= LEVELS.length) {
      this.scene.stop('HUD');
      this.scene.start('Victory');
    } else {
      this.scene.start('LevelIntro');
    }
  }

  /* ---------------------------------------------------- public helpers */

  killPlayer(pit: boolean): void {
    if (this.mode !== 'play' || !this.player.alive) return;
    this.mode = 'dying';
    this.frozen = false;
    this.physics.pause();
    audio.stopMusic();
    audio.playMusic('death');
    this.player.die(pit);
    G.power = startPower();
    this.time.delayedCall(TIMING.deathRestartMs, () => {
      G.lives--;
      if (G.lives <= 0) {
        this.scene.stop('HUD');
        this.scene.start('GameOver');
      } else {
        this.scene.start('LevelIntro');
      }
    });
  }

  /** Freeze the world briefly (grow/shrink), like the classic transformation pause. */
  freeze(ms: number): void {
    this.frozen = true;
    this.freezeUntil = this.now + ms;
    this.physics.pause();
    if (this.player.mode === 'normal') this.player.mode = 'frozen';
  }

  throwPickledOnion(p: Player): boolean {
    if (this.playerShots.countActive(true) >= PLAYER.maxProjectiles) return false;
    new PickledOnion(this, p.x + p.facing * 8, p.y - (p.big ? 18 : 8), p.facing);
    audio.sfx('fireball');
    return true;
  }

  awardChain(x: number, y: number, n: number): void {
    const s = chainScore(n);
    if (s < 0) {
      addLife();
      audio.sfx('oneup');
      fx.popup(this, x, y, '1UP');
    } else this.awardPoints(x, y, s);
  }

  awardPoints(x: number, y: number, pts: number): void {
    addScore(pts);
    fx.popup(this, x, y, pts);
  }

  popup(x: number, y: number, text: string | number): void {
    fx.popup(this, x, y, text);
  }

  dust(x: number, y: number): void {
    fx.flash(this, 'dust', 3, x, y - 3, 70, 15);
  }

  poof(x: number, y: number): void {
    fx.flash(this, 'poof', 3, x, y, 50);
    audio.sfx('poof');
  }

  onScreen(x: number): boolean {
    const cam = this.cameras.main;
    return x > cam.scrollX - 8 && x < cam.scrollX + GAME_WIDTH + 8;
  }
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
