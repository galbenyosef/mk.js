import Phaser from 'phaser';
import { CONFIG } from '@mk.js/shared';
import type { Fighter } from './Fighter.js';

export class HUD {
  private _scene: Phaser.Scene;
  private _bars: { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle }[] = [];
  private _names: Phaser.GameObjects.Text[] = [];
  private _roundText?: Phaser.GameObjects.Text;
  private _winnerText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, fighters: Fighter[]) {
    this._scene = scene;
    const barWidth = 180;
    for (let i = 0; i < fighters.length; i++) {
      const isRight = i === 1;
      const x = isRight ? 410 : 10;
      const bg = scene.add.rectangle(x, 25, barWidth, 14, 0xff0000).setOrigin(0, 0.5);
      const fill = scene.add.rectangle(x, 25, barWidth, 14, 0x3cd400).setOrigin(0, 0.5);
      this._bars.push({ bg, fill });
      this._names.push(
        scene.add.text(x, 8, fighters[i].fighterName.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#ffffff',
          fontStyle: 'italic',
        }).setOrigin(0, 0),
      );
    }
  }

  updateHealth(fighters: Fighter[]): void {
    for (let i = 0; i < fighters.length; i++) {
      const pct = fighters[i].hp / CONFIG.STARTING_HP;
      this._bars[i].fill.setScale(Math.max(0, pct), 1);
    }
  }

  showRound(round: number): void {
    this._clearTexts();
    this._roundText = this._scene.add.text(300, 150, `ROUND ${round}`, {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffff00',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);
    this._scene.time.delayedCall(1500, () => {
      this._roundText?.destroy();
      this._roundText = undefined;
    });
  }

  showFight(): void {
    this._roundText = this._scene.add.text(300, 200, 'FIGHT!', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ff4400',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);
    this._scene.time.delayedCall(800, () => {
      this._roundText?.destroy();
      this._roundText = undefined;
    });
  }

  showWinner(name: string): void {
    this._clearTexts();
    this._winnerText = this._scene.add.text(300, 150, `${name.toUpperCase()} WINS!`, {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ff0000',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(100);
  }

  private _clearTexts(): void {
    this._roundText?.destroy();
    this._roundText = undefined;
    this._winnerText?.destroy();
    this._winnerText = undefined;
  }

  destroy(): void {
    this._bars.forEach((b) => { b.bg.destroy(); b.fill.destroy(); });
    this._names.forEach((n) => n.destroy());
    this._clearTexts();
  }
}
