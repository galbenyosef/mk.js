import Phaser from 'phaser';
import { getDiagnosticsScene } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    const diagScene = getDiagnosticsScene();
    if (diagScene) {
      this.scene.start('Diagnostics');
    } else {
      this.scene.start('Preload');
    }
  }
}
