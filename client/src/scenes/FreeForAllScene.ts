import { BaseScene } from "./BaseScene";

export class FreeForAllScene extends BaseScene {
  roomName = "default_room";
  userRoomName = "ffa_room";

  // Game configuration
  mode = "ffa";
  scoring = "kills";
  teams = false;

  constructor() {
    super({ key: "ffa" });
  }

  initMap() {
    try {
      this.cameras.main.setBounds(0, 0, 2240, 1344);
      this.physics.world.setBounds(0, 0, 2240 * 2, 1344 * 2);

      const map = this.make.tilemap({ key: "tilemap" });

      const tileset = map.addTilesetImage("Tileset", "TilesetExtruded", 32, 32, 1, 2);

      map.createLayer("base", tileset); // base
    } catch (e: any) {
      console.log("failed to initalize map", e);
    }
  }
}
