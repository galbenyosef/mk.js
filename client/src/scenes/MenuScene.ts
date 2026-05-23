import Phaser from 'phaser';
import type { GameOptions } from '@mk.js/shared';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#111111');
    this.add.text(300, 60, 'MK.JS', {
      fontFamily: 'monospace', fontSize: '48px', color: '#ff0000', fontStyle: 'bold',
    }).setOrigin(0.5);

    const modes: { label: string; mode: GameOptions['mode'] }[] = [
      { label: '1 PLAYER VS AI', mode: 'ai' },
      { label: '2 PLAYERS LOCAL', mode: 'local' },
      { label: 'NETWORK MULTIPLAYER', mode: 'network' },
    ];

    modes.forEach(({ label, mode }, i) => {
      const y = 160 + i * 50;
      const btn = this.add.text(300, y, label, {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
        backgroundColor: '#333333', padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setColor('#ffff00'));
      btn.on('pointerout', () => btn.setColor('#ffffff'));
      btn.on('pointerdown', () => {
        if (mode === 'network') {
          this.scene.start('Lobby');
        } else {
          const options: GameOptions = {
            mode,
            p1Fighter: 'subzero',
            p2Fighter: 'kano',
            arena: 'throne-room',
          };
          this.scene.start('Game', options);
        }
      });
    });
  }
}
