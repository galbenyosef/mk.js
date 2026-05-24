import Phaser from 'phaser';
import type { GameOptions } from '@mk.js/shared';

const FIGHTERS = ['subzero', 'kano', 'liukang', 'sonya'];
const DISPLAY = ['SUB-ZERO', 'KANO', 'LIU KANG', 'SONYA'];

export class MenuScene extends Phaser.Scene {
  private _p1Fighter = 0;
  private _p2Fighter = 1;

  constructor() { super({ key: 'Menu' }); }

  create(): void {
    this.cameras.main.setBackgroundColor('#111111');
    this.add.text(300, 25, 'MK.JS', {
      fontFamily: 'monospace', fontSize: '48px', color: '#ff0000', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Fighter selectors
    this.add.text(200, 85, 'P1:', { fontFamily: 'monospace', fontSize: '16px', color: '#00ccff' }).setOrigin(0.5);
    const p1Text = this.add.text(250, 85, DISPLAY[this._p1Fighter], {
      fontFamily: 'monospace', fontSize: '16px', color: '#fff',
      backgroundColor: '#444', padding: { x: 8, y: 4 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    this.add.text(370, 85, 'P2:', { fontFamily: 'monospace', fontSize: '16px', color: '#ff6666' }).setOrigin(0.5);
    const p2Text = this.add.text(400, 85, DISPLAY[this._p2Fighter], {
      fontFamily: 'monospace', fontSize: '16px', color: '#fff',
      backgroundColor: '#444', padding: { x: 8, y: 4 },
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    p1Text.on('pointerdown', () => {
      this._p1Fighter = (this._p1Fighter + 1) % FIGHTERS.length;
      if (this._p1Fighter === this._p2Fighter) this._p1Fighter = (this._p1Fighter + 1) % FIGHTERS.length;
      p1Text.setText(DISPLAY[this._p1Fighter]);
    });
    p2Text.on('pointerdown', () => {
      this._p2Fighter = (this._p2Fighter + 1) % FIGHTERS.length;
      if (this._p2Fighter === this._p1Fighter) this._p2Fighter = (this._p2Fighter + 1) % FIGHTERS.length;
      p2Text.setText(DISPLAY[this._p2Fighter]);
    });

    const modes: { label: string; mode: GameOptions['mode'] }[] = [
      { label: '1 PLAYER BASIC', mode: 'basic' },
      { label: '1 PLAYER VS AI', mode: 'ai' },
      { label: '2 PLAYERS LOCAL', mode: 'local' },
      { label: 'NETWORK MULTIPLAYER', mode: 'network' },
    ];

    modes.forEach(({ label, mode }, i) => {
      const y = 160 + i * 50;
      const btn = this.add.text(300, y, label, {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
        backgroundColor: '#333', padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setColor('#ffff00'));
      btn.on('pointerout', () => btn.setColor('#ffffff'));
      btn.on('pointerdown', () => {
        try { this.sound.play('sfx/select', { volume: 0.4 }); } catch {}
        if (mode === 'network') {
          this.scene.start('Lobby');
        } else {
          const options: GameOptions = {
            mode,
            p1Fighter: FIGHTERS[this._p1Fighter],
            p2Fighter: FIGHTERS[this._p2Fighter],
            arena: 'throne-room',
          };
          this.scene.start('Game', options);
        }
      });
    });

// Diagnostics button
const diagBtn = this.add.text(300, 370, 'DIAGNOSTICS', {
  fontFamily: 'monospace', fontSize: '14px', color: '#888888',
  backgroundColor: '#222', padding: { x: 12, y: 6 },
}).setOrigin(0.5).setInteractive({ useHandCursor: true });

diagBtn.on('pointerover', () => diagBtn.setColor('#ffff00'));
diagBtn.on('pointerout', () => diagBtn.setColor('#888888'));
diagBtn.on('pointerdown', () => {
  this.scene.start('Diagnostics');
});
  }
}

