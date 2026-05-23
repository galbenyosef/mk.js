import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'Preload' }); }

  preload(): void {
    const bar = this.add.rectangle(300, 200, 400, 20, 0xffffff).setOrigin(0.5);
    this.load.on('progress', (v: number) => bar.setScale(v, 1));
    this.load.atlas('fighters/subzero', '/assets/build/subzero/spritesheet.png', '/assets/build/subzero/spritesheet.json');
    this.load.atlas('fighters/kano', '/assets/build/kano/spritesheet.png', '/assets/build/kano/spritesheet.json');
    this.load.image('arenas/throne-room', '/assets/build/arenas/throne-room.png');
    this.load.audio('sfx/hit', '/assets/build/sounds/hitsounds/mk3-00100.mp3');
    this.load.audio('sfx/hit2', '/assets/build/sounds/hitsounds/mk3-00105.mp3');
    this.load.audio('sfx/round', '/assets/build/sounds/ui/mk3-01145.mp3');
    this.load.audio('sfx/select', '/assets/build/sounds/ui/mk3-01060.mp3');
    this.load.audio('sfx/win', '/assets/build/sounds/ui/mk3-01085.mp3');
  }

  create(): void { this.scene.start('Menu'); }
}
