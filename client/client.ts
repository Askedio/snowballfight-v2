import Phaser from "phaser";
import { GameScene } from "./GameScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container", // Attach Phaser canvas to a container div
  scene: GameScene,
};

const game = new Phaser.Game(config);
