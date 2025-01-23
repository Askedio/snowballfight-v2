import { BaseScene } from "./BaseScene";

export class FreeForAllScene extends BaseScene {
  roomName = "default_room";
  userRoomName = "user_room";

  // Game configuration
  mode = "ffa";
  scoring = "kills";
  teams = false;

  constructor() {
    super({ key: "ffa" });

    this.init();
  }

  initMap() {
    this.add.image(0, 0, "Tileset").setOrigin(0, 0);
    this.cameras.main.setBounds(0, 0, 2240, 1344);
    this.physics.world.setBounds(0, 0, 2240 * 2, 1344 * 2);

    const map = this.make.tilemap({ key: "tilemap" });

    const tileset = map.addTilesetImage("Tileset");

    map.createLayer("base", tileset); // base
  }
}
