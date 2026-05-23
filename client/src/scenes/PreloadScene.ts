import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'Preload' }); }

  preload(): void {
    const bar = this.add.rectangle(300, 200, 400, 20, 0xffffff).setOrigin(0.5);
    this.load.on('progress', (v: number) => bar.setScale(v, 1));
    this.load.atlas('fighters/subzero', '/assets/build/subzero/spritesheet.png', '/assets/build/subzero/spritesheet.json');
    this.load.atlas('fighters/kano', '/assets/build/kano/spritesheet.png', '/assets/build/kano/spritesheet.json');
    this.load.image('arenas/throne-room', '/assets/build/arenas/throne-room.png');
  }

  create(): void { this.scene.start('Menu'); }
}
