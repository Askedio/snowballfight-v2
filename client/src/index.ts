import Phaser from "phaser";

import { SceneSelector } from "./scenes/SceneSelector";

import { Part4Scene } from "./scenes/Part4Scene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  fps: {
    target: 60,
    forceSetTimeOut: true,
    smoothStep: false,
  },
  width: 800,
  height: 600,
  // height: 200,
  backgroundColor: "#000000",
  parent: "phaser-example",
  physics: {
    default: "arcade",
  },
  pixelArt: true,
  scene: [SceneSelector, Part4Scene],
};

const game = new Phaser.Game(config);
