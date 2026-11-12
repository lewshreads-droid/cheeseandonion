import Phaser from 'phaser';

/** Floating score/1UP text. */
export function popup(scene: Phaser.Scene, x: number, y: number, text: string | number): void {
  const t = scene.add.bitmapText(Math.round(x), Math.round(y), 'font', String(text)).setOrigin(0.5, 1).setDepth(40);
  scene.tweens.add({ targets: t, y: y - 28, duration: 750, ease: 'Quad.out', onComplete: () => t.destroy() });
}

/** Short-lived frame-stepped sprite (sparkle, poof, dust). */
export function flash(scene: Phaser.Scene, key: string, frames: number, x: number, y: number, ms = 60, depth = 30): void {
  const s = scene.add.image(Math.round(x), Math.round(y), key, 0).setDepth(depth);
  let f = 0;
  scene.time.addEvent({
    delay: ms, repeat: frames - 1,
    callback: () => {
      f++;
      if (f >= frames) s.destroy();
      else s.setFrame(f);
    },
  });
}

export function sparkle(scene: Phaser.Scene, x: number, y: number): void {
  flash(scene, 'sparkle', 4, x, y, 55);
  flash(scene, 'sparkle', 4, x + 5, y - 5, 70);
}

/** Onion popping out of a block: spins up, falls back, sparkles. */
export function blockOnion(scene: Phaser.Scene, x: number, y: number, done: () => void): void {
  const o = scene.add.image(x, y, 'onion', 0).setDepth(4);
  scene.tweens.add({
    targets: o, y: y - 40, duration: 260, ease: 'Quad.out', yoyo: true, hold: 20,
    onUpdate: () => o.setScale(Math.cos(scene.time.now / 45), 1),
    onComplete: () => {
      sparkle(scene, o.x, o.y - 8);
      o.destroy();
      done();
    },
  });
}

/** Four brick shards flying out. */
export function debris(scene: Phaser.Scene, key: string, x: number, y: number): void {
  const v: [number, number, number, number][] = [[-4, -4, -70, -300], [4, -4, 70, -300], [-4, 4, -60, -200], [4, 4, 60, -200]];
  for (const [dx, dy, vx, vy] of v) {
    const d = scene.physics.add.image(x + dx, y + dy, key).setDepth(25);
    d.body.setVelocity(vx, vy);
    d.setAngularVelocity(vx > 0 ? 500 : -500);
    scene.time.delayedCall(1400, () => d.destroy());
  }
}
