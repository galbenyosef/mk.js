import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    const bar = this.add.rectangle(300, 200, 400, 20, 0xffffff);
    bar.setOrigin(0.5);
    this.load.on('progress', (v: number) => {
      bar.setScale(v, 1);
    });
  }

  create(): void {
    this.scene.start('Menu');
  }
}
