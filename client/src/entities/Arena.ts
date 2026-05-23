import Phaser from 'phaser';
import { CONFIG } from '@mk.js/shared';
import type { Fighter } from './Fighter.js';

export class Arena {
  private _scene: Phaser.Scene;
  public width: number;
  public height: number;

  constructor(scene: Phaser.Scene) {
    this._scene = scene;
    this.width = CONFIG.ARENA_WIDTH;
    this.height = CONFIG.ARENA_HEIGHT;
  }

  constrainFighter(fighter: Fighter, target: { x: number; y: number }): { x: number; y: number } {
    const halfW = fighter.displayWidth / 2;
    if (target.x < halfW) target.x = halfW;
    if (target.x > this.width - halfW) target.x = this.width - halfW;
    return target;
  }

  syncFighters(f1: Fighter, f2: Fighter): void {
    if (f1.x < f2.x) {
      f1.setOrientation('left');
      f2.setOrientation('right');
    } else {
      f1.setOrientation('right');
      f2.setOrientation('left');
    }
  }

  blockOverlap(attacker: Fighter, defender: Fighter): boolean {
    return Phaser.Geom.Intersects.RectangleToRectangle(
      attacker.getBounds(),
      defender.getBounds(),
    );
  }

  calculateDistance(f1: Fighter, f2: Fighter): number {
    return Math.abs(f1.x - f2.x);
  }
}
