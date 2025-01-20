import Phaser from "phaser";

export class SceneSelector extends Phaser.Scene {
  constructor() {
    super({ key: "selector", active: true });
  }

  preload() {
    // update menu background color
    this.cameras.main.setBackgroundColor(0x000000);

    this.load.image(
      "playersa_01",
      "/assets/images/skins/player/playersa_01.png"
    );
    this.load.image(
      "playersb_01",
      "/assets/images/skins/player/playersb_01.png"
    );
    this.load.image(
      "playersc_01",
      "/assets/images/skins/player/playersc_01.png"
    );

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
