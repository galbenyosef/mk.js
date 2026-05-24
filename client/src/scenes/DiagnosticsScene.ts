import Phaser from 'phaser';
import { createAnimations } from '../moves/MoveRegistry.js';

const FIGHTERS = ['subzero', 'kano', 'liukang', 'sonya'];
const GRID_COLS = 8;
const GRID_SPACING = 6;
const SPRITE_SCALE = 1.5;

export class DiagnosticsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Diagnostics' });
  }

  preload(): void {
    this.load.atlas('fighters/subzero', '/assets/build/subzero/spritesheet.png', '/assets/build/subzero/spritesheet.json');
    this.load.atlas('fighters/kano', '/assets/build/kano/spritesheet.png', '/assets/build/kano/spritesheet.json');
    this.load.atlas('fighters/liukang', '/assets/build/liukang/spritesheet.png', '/assets/build/liukang/spritesheet.json');
    this.load.atlas('fighters/sonya', '/assets/build/sonya/spritesheet.png', '/assets/build/sonya/spritesheet.json');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#111111');

    let yOffset = 20;

    for (const fighter of FIGHTERS) {
      const atlasKey = `fighters/${fighter}`;
      createAnimations(this, fighter, atlasKey);

      const texture = this.textures.get(atlasKey);
      const frameNames = texture.getFrameNames().sort();

      this.add.text(300, yOffset, fighter.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '20px', color: '#ff0000', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      yOffset += 30;

      const frameSize = 40;
      for (let i = 0; i < frameNames.length; i++) {
        const col = i % GRID_COLS;
        const row = Math.floor(i / GRID_COLS);
        const x = 30 + col * (frameSize + GRID_SPACING);
        const y = yOffset + row * (frameSize + GRID_SPACING);

        const sprite = this.add.sprite(x + frameSize / 2, y + frameSize / 2, atlasKey, frameNames[i]);
        sprite.setOrigin(0.5, 0.5);
        sprite.setScale(Math.min(SPRITE_SCALE, frameSize / Math.max(sprite.width, sprite.height)));

        if (col === 0) {
          this.add.text(x - 5, y + frameSize / 2, String(i + 1), {
            fontFamily: 'monospace', fontSize: '8px', color: '#666',
          }).setOrigin(1, 0.5);
        }
      }

      yOffset += Math.ceil(frameNames.length / GRID_COLS) * (frameSize + GRID_SPACING) + 20;

      this.add.text(300, yOffset, `${fighter.toUpperCase()} — Animations`, {
        fontFamily: 'monospace', fontSize: '16px', color: '#ff6666',
      }).setOrigin(0.5, 0);
      yOffset += 25;

      const animKeys = Object.keys((this.anims as any).anims.entries)
        .filter((k: string) => k.startsWith(`${fighter}_`));

      let animX = 20;
      for (const key of animKeys) {
        const shortName = key.replace(`${fighter}_`, '');
        const sprite = this.add.sprite(animX + 30, yOffset + 20, atlasKey);
        sprite.setOrigin(0.5, 0.5);
        sprite.setScale(SPRITE_SCALE);
        sprite.play(key);

        this.add.text(animX + 30, yOffset + 10 + frameSize, shortName, {
          fontFamily: 'monospace', fontSize: '9px', color: '#888',
        }).setOrigin(0.5, 0);

        animX += 90;
        if (animX > 560) {
          animX = 20;
          yOffset += 70;
        }
      }
      yOffset += 60;
    }

    this.cameras.main.setBounds(0, 0, 600, Math.max(400, yOffset + 20));

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        this.cameras.main.scrollY = Math.min(this.cameras.main.scrollY + 20, this.cameras.main.getBounds().height - 400);
      } else if (event.key === 'ArrowUp') {
        this.cameras.main.scrollY = Math.max(this.cameras.main.scrollY - 20, 0);
      } else if (event.key === 'Escape') {
        this.scene.start('Menu');
      }
    });

    this.add.text(300, yOffset + 10, 'Arrow keys to scroll  |  ESC to return', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555',
    }).setOrigin(0.5, 0);
  }
}
