import Phaser from 'phaser';

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Lobby' });
  }

  create(): void {
    this.scene.start('Game');
  }
}
