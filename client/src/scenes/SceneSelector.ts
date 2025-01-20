import Phaser from "phaser";

export class SceneSelector extends Phaser.Scene {
  constructor() {
    super({ key: "selector", active: true });
  }

  preload() {
    // update menu background color
    this.cameras.main.setBackgroundColor(0x000000);

    

    this.load.image("snowball", "/assets/images/weapons/snowball.png");

  
  }

  create() {
    // automatically navigate to hash scene if provided

    if (window.location.hash) {
      this.runScene(window.location.hash.substring(1));
      return;
    }

    this.runScene(`part${4}`);
  }

  runScene(key: string) {
    this.game.scene.switch("selector", key);
  }
}
