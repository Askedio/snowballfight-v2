import { BaseScene } from "./BaseScene";

export class CtfScene extends BaseScene {
  roomName = "ctf_room";
  userRoomName = "user_ctf_room";

  // Game configuration
  mode = "ctf";
  scoring = "kills";
  teams = false;

  constructor() {
    super({ key: "ctf" });
  }

  initMap() {
    try {
      this.add.image(0, 0, "Tileset").setOrigin(0, 0);
      this.cameras.main.setBounds(0, 0, 2240, 1344);
      this.physics.world.setBounds(0, 0, 2240 * 2, 1344 * 2);

      const map = this.make.tilemap({ key: "tilemap" });

      const tileset = map.addTilesetImage("Tileset");

      map.createLayer("base", tileset); // base
    } catch (e: any) {
      console.log("failed to initalize map");
    }
  }

  preload() {
    super.preload();

    this.load.setPath("/.proxy/assets");


    this.load.atlas(
      "flag",
      "/sprites/flag/flag.png",
      "/sprites/flag/flag.json"
    );
  }

  createAnimations() {
      super.createAnimations();

      if (this.anims.exists("flag")) {
        return;
      }
  
      this.anims.create({
        key: "flag",
        frames: "flag",
        frameRate: 5,
        repeat: -1,
        hideOnComplete: false,
      });
  }
}
