import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { GameScene } from './scenes/GameScene.js';
import { isDeterministic } from './config.js';

declare global {
  interface Window { __MK_GAME?: Phaser.Game; __MK_DETERMINISTIC?: boolean; }
}

const deterministic = isDeterministic();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 600,
  height: 400,
  parent: 'game-container',
  backgroundColor: '#000000',
  scene: [BootScene, PreloadScene, MenuScene, LobbyScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  ...(deterministic ? {
    fps: { target: 60, forceSetTimeOut: true },
  } : {}),
};

const game = new Phaser.Game(config);

if (deterministic) {
  Phaser.Math.RND.sow(['mk-test-1234']);
  game.loop.sleep();
  game.loop.wake();
}

window.__MK_GAME = game;
