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
  scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#000000",
  parent: "phaser-example",
  physics: {
    default: "arcade",
  },
  scene: [SceneSelector, Part4Scene],
};

const game = new Phaser.Game(config);
