import { FreeForAllOnCreateCommand } from "../commands/create/FreeForAllOnCreateCommand";
import { FreeForAllFixedTickCommand } from "../commands/tick/FreeForAllFixedTickCommand";
import { FreeForAllRoomState } from "../states/FreeForAllRoomState";
import { BaseRoom } from "./BaseRoom";

export class FreeForAllRoom extends BaseRoom<FreeForAllRoomState> {
  // Game configuration
  maxClients = 10;
  maxBots = 0;

  mode = "ffa";
  scoring = "kills";
  teams = false;

  // Map configuration
  map = "../client/static/assets/maps/winter/map.json";
  layers = {
    base: "base",
    collisions: "collisions",
    land: "Tile Layer 1",
    spawnLayer: "spawns",
  };

  async onCreate() {
    this.setState(new FreeForAllRoomState());
    super.onCreate();

    this.dispatcher.dispatch(new FreeForAllOnCreateCommand(), {
      tilemapManager: this.tilemapManager,
      maxBots: this.maxBots
    });
  }

  fixedTick() {
    this.dispatcher.dispatch(new FreeForAllFixedTickCommand(), {
      tilemapManager: this.tilemapManager,
      collisionSystem: this.collisionSystem,
    });
  }
}
