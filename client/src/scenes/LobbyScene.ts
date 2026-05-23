import Phaser from 'phaser';
import { GameSocket } from '../networking/GameSocket.js';
import type { GameOptions, GameInfo } from '@mk.js/shared';

export class LobbyScene extends Phaser.Scene {
  private _socket!: GameSocket;
  private _statusText!: Phaser.GameObjects.Text;
  private _gameListText!: Phaser.GameObjects.Text;
  private _gameName = 'game1';
  private _isHost = false;
  private _refreshTimer?: ReturnType<typeof setInterval>;

  constructor() {
    super({ key: 'Lobby' });
  }

  create(): void {
    this._socket = new GameSocket();
    this.cameras.main.setBackgroundColor('#111111');

    this.add.text(300, 20, 'NETWORK LOBBY', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ff0000', fontStyle: 'bold',
    }).setOrigin(0.5);

    this._statusText = this.add.text(300, 55, 'Connected', {
      fontFamily: 'monospace', fontSize: '14px', color: '#888',
    }).setOrigin(0.5);

    this.add.text(300, 100, 'Game Name:', {
      fontFamily: 'monospace', fontSize: '14px', color: '#aaa',
    }).setOrigin(0.5);

    this._gameName = 'game' + Math.floor(Math.random() * 1000);
    const nameText = this.add.text(300, 125, this._gameName, {
      fontFamily: 'monospace', fontSize: '16px', color: '#fff',
      backgroundColor: '#333', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nameText.on('pointerdown', () => {
      const input = prompt('Enter game name:', this._gameName);
      if (input && input.trim()) {
        this._gameName = input.trim();
        nameText.setText(this._gameName);
      }
    });

    this._gameListText = this.add.text(300, 180, 'Loading games...', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ccc',
      align: 'center', wordWrap: { width: 400 },
    }).setOrigin(0.5, 0);

    const createBtn = this.add.text(180, 310, 'CREATE GAME', {
      fontFamily: 'monospace', fontSize: '16px', color: '#00ff00',
      backgroundColor: '#333', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const joinBtn = this.add.text(420, 310, 'JOIN GAME', {
      fontFamily: 'monospace', fontSize: '16px', color: '#00ccff',
      backgroundColor: '#333', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const backBtn = this.add.text(300, 360, 'BACK TO MENU', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff6666',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    createBtn.on('pointerdown', async () => {
      this._isHost = true;
      this._statusText.setText('Creating game...');
      try {
        await this._socket.createGame(this._gameName);
        this._statusText.setText('Waiting for opponent...');
      } catch { this._statusText.setText('Error: game exists'); }
    });

    joinBtn.on('pointerdown', async () => {
      this._isHost = false;
      this._statusText.setText('Joining game...');
      try {
        await this._socket.joinGame(this._gameName);
        this._statusText.setText('Joined!');
      } catch { this._statusText.setText('Error: game not found or full'); }
    });

    this._socket.onPlayerJoined((data) => {
      this._statusText.setText(`${data.fighterName} joined!`);
    });

    this._socket.onPlayerLeft(() => {
      this._statusText.setText('Opponent disconnected');
    });

    this._socket.onGameReady(() => {
      const options: GameOptions = {
        mode: 'network',
        p1Fighter: 'subzero',
        p2Fighter: 'kano',
        arena: 'throne-room',
        isHost: this._isHost,
        gameName: this._gameName,
      };
      this.scene.start('Game', { options });
    });

    backBtn.on('pointerdown', () => {
      this._socket.disconnect();
      this.scene.start('Menu');
    });

    this.refreshGameList();
    this._refreshTimer = setInterval(() => this.refreshGameList(), 3000);
  }

  private async refreshGameList(): Promise<void> {
    try {
      const games = await this._socket.getGameList();
      if (!games || games.length === 0) {
        this._gameListText.setText('No open games. Create one!');
      } else {
        this._gameListText.setText(games.map((g: GameInfo) =>
          `${g.gameName} (${g.playerCount}/2)`
        ).join('\n'));
      }
    } catch {
      this._gameListText.setText('Failed to fetch games');
    }
  }

  shutdown(): void {
    if (this._refreshTimer) clearInterval(this._refreshTimer);
    this._socket?.disconnect();
  }
}
