import Phaser from 'phaser';
import { GameSocket } from '../networking/GameSocket.js';
import type { GameOptions } from '@mk.js/shared';

export class LobbyScene extends Phaser.Scene {
  private _socket!: GameSocket;
  private _statusText!: Phaser.GameObjects.Text;
  private _gameListText!: Phaser.GameObjects.Text;
  private _isHost = false;

  constructor() {
    super({ key: 'Lobby' });
  }

  create(): void {
    this._socket = new GameSocket();
    this.cameras.main.setBackgroundColor('#111111');

    this.add.text(300, 30, 'NETWORK LOBBY', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ff0000', fontStyle: 'bold',
    }).setOrigin(0.5);

    this._statusText = this.add.text(300, 70, 'Connected', {
      fontFamily: 'monospace', fontSize: '14px', color: '#888888',
    }).setOrigin(0.5);

    this._gameListText = this.add.text(300, 150, 'No open games.', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);

    const createBtn = this.add.text(200, 300, 'CREATE GAME', {
      fontFamily: 'monospace', fontSize: '18px', color: '#00ff00',
      backgroundColor: '#333', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const joinBtn = this.add.text(400, 300, 'JOIN GAME', {
      fontFamily: 'monospace', fontSize: '18px', color: '#00ccff',
      backgroundColor: '#333', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const backBtn = this.add.text(300, 360, 'BACK', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff6666',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    createBtn.on('pointerdown', async () => {
      this._isHost = true;
      this._statusText.setText('Creating game...');
      try {
        await this._socket.createGame('game1');
        this._statusText.setText('Waiting for opponent...');
      } catch (e) {
        this._statusText.setText('Error: game already exists');
      }
    });

    joinBtn.on('pointerdown', async () => {
      this._isHost = false;
      this._statusText.setText('Joining game...');
      try {
        await this._socket.joinGame('game1');
        this._statusText.setText('Joined!');
      } catch (e) {
        this._statusText.setText('Error: game not found or full');
      }
    });

    this._socket.onGameReady(() => {
      const options: GameOptions = {
        mode: 'network',
        p1Fighter: 'subzero',
        p2Fighter: 'kano',
        arena: 'throne-room',
        isHost: this._isHost,
        gameName: 'game1',
      };
      this.scene.start('Game', options);
    });

    backBtn.on('pointerdown', () => {
      this._socket.disconnect();
      this.scene.start('Menu');
    });
  }
}
