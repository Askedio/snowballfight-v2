import { CtfFixedTickCommand } from "../commands/tick/CtfFixedTickCommand";
import { CtfRoomState } from "../states/CtfRoomState";
import { BaseRoom } from "./BaseRoom";

export class CtfRoom extends BaseRoom {
  // Game configuration
  maxClients = 20;
  mode = "ctf";
  scoring = "kills";
  teams = false;

  // Map configuration
  map = "../client/static/assets/maps/winter/map.json";
  layers = {
    base: "base",
    colissions: "Colissins",
    land: "Tile Layer 1",
    spawnLayer: "spawns",
  };

  async onCreate() {
    this.setState(new CtfRoomState());
    super.onCreate();
  }

  fixedTick() {
    this.dispatcher.dispatch(new CtfFixedTickCommand(), {
      tilemapManager: this.tilemapManager,
      collisionSystem: this.collisionSystem,
    });
  }
}
