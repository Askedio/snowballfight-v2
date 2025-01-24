import { FreeForAllFixedTickCommand } from "../commands/tick/FreeForAllFixedTickCommand";
import { FreeForAllRoomState } from "../states/FreeForAllRoomState";
import { BaseRoom } from "./BaseRoom";

export class FreeForAllRoom extends BaseRoom {
  // Game configuration
  maxClients = 20;
  maxBots = 1;

  mode = "ffa";
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
    this.setState(new FreeForAllRoomState());
    super.onCreate();
  }

  fixedTick() {
    this.dispatcher.dispatch(new FreeForAllFixedTickCommand(), {
      tilemapManager: this.tilemapManager,
      collisionSystem: this.collisionSystem,
    });
  }
}
