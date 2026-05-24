import Phaser from 'phaser';
import type { Fighter } from '../entities/Fighter.js';

interface OverlayState {
  hitboxes: boolean;
  spriteBounds: boolean;
  origins: boolean;
  atlasFrames: boolean;
  animationState: boolean;
}

const KEY_BINDINGS: Record<number, keyof OverlayState | '__all__'> = {
  112: 'hitboxes',
  113: 'spriteBounds',
  114: 'origins',
  115: 'atlasFrames',
  116: 'animationState',
  117: '__all__',
};

export class DebugOverlay {
  private _gfx: Phaser.GameObjects.Graphics;
  private _state: OverlayState = {
    hitboxes: false,
    spriteBounds: false,
    origins: false,
    atlasFrames: false,
    animationState: false,
  };
  private _texts: Phaser.GameObjects.Text[] = [];
  private _fighters: [Fighter, Fighter];

  constructor(scene: Phaser.Scene, fighters: [Fighter, Fighter]) {
    this._fighters = fighters;
    this._gfx = scene.add.graphics();
    this._gfx.setDepth(9999);
    this._gfx.setVisible(false);

    scene.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const binding = KEY_BINDINGS[event.keyCode];
      if (!binding) return;

      if (binding === '__all__') {
        const anyOff = Object.values(this._state).some((v) => !v);
        const newVal = anyOff;
        for (const k of Object.keys(this._state) as (keyof OverlayState)[]) {
          this._state[k] = newVal;
        }
      } else {
        this._state[binding] = !this._state[binding];
      }
    });

    scene.events.on('postupdate', () => this._draw());
  }

  private _draw(): void {
    const anyOn = Object.values(this._state).some((v) => v);
    this._gfx.setVisible(anyOn);
    for (const t of this._texts) t.setVisible(anyOn);
    if (!anyOn) return;

    this._gfx.clear();
    for (const t of this._texts) t.destroy();
    this._texts = [];

    for (const f of this._fighters) {
      const bounds = f.getBounds();

      if (this._state.hitboxes) {
        this._gfx.lineStyle(1, 0xff0000, 0.8);
        this._gfx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }

      if (this._state.spriteBounds) {
        this._gfx.lineStyle(1, 0xffff00, 0.7);
        this._gfx.strokeRect(f.x - f.displayWidth / 2, f.y - f.displayHeight,
          f.displayWidth, f.displayHeight);
      }

      if (this._state.origins) {
        this._gfx.lineStyle(1, 0x00ff00, 0.8);
        this._gfx.strokeCircle(f.x, f.y, 3);
        const label = f.scene.add.text(f.x + 5, f.y + 5,
          `(${Math.round(f.x)},${Math.round(f.y)})`, {
            fontFamily: 'monospace', fontSize: '10px', color: '#00ff00',
            backgroundColor: 'rgba(0,0,0,0.6)',
          }).setDepth(10000);
        this._texts.push(label);
      }

      if (this._state.atlasFrames) {
        const frameName = f.frame?.name?.toString() ?? '?';
        const atlasKey = f.texture?.key ?? '?';
        const label = f.scene.add.text(f.x, f.y - f.displayHeight - 10,
          `${frameName} @ ${atlasKey}`, {
            fontFamily: 'monospace', fontSize: '9px', color: '#00ccff',
            backgroundColor: 'rgba(0,0,0,0.7)',
          }).setOrigin(0.5, 1).setDepth(10000);
        this._texts.push(label);
      }

      if (this._state.animationState) {
        const anim = f.anims?.currentAnim;
        const info = anim
          ? `${anim.key}[${f.anims.currentFrame?.index ?? 0}/${anim.frames.length}] ${Math.round((f.anims.getProgress?.() ?? 0) * 100)}%`
          : 'no anim';
        const label = f.scene.add.text(f.x, f.y - f.displayHeight - 22,
          info, {
            fontFamily: 'monospace', fontSize: '9px', color: '#ffcc00',
            backgroundColor: 'rgba(0,0,0,0.7)',
          }).setOrigin(0.5, 1).setDepth(10000);
        this._texts.push(label);
      }
    }
  }
}
