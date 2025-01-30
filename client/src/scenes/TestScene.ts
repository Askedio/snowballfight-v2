import { BaseScene } from "./BaseScene";

export class TestScene extends BaseScene {
  roomName = "test_room";
  userRoomName = "test_room";

  // Game configuration
  mode = "test";
  scoring = "kills";
  teams = false;

  constructor() {
    super({ key: "test" });
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
      console.log("failed to initalize map", e);
    }
  }
}
