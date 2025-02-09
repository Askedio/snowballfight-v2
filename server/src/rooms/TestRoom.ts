import { TestRoomOnCreateCommand } from "../commands/create/TestRoomOnCreateCommand";
import { FreeForAllFixedTickCommand } from "../commands/tick/FreeForAllFixedTickCommand";
import { TestRoomState } from "../states/TestRoomState";
import { BaseRoom } from "./BaseRoom";

export class TestRoom extends BaseRoom<TestRoomState> {
  // Game configuration
  maxClients = 10;
  maxBots = 1;

  // Map configuration
  map = "../client/public/assets/maps/winter/map.json";
  layers = {
    base: "base",
    collisions: "collisions",
    land: "Tile Layer 1",
    spawnLayer: "spawns",
  };

  async onCreate() {
    this.setState(new TestRoomState());
    super.onCreate();

    this.dispatcher.dispatch(new TestRoomOnCreateCommand(), {
      mapManager: this.mapManager,
      maxBots: this.maxBots,
    });
  }

  fixedTick() {
    this.dispatcher.dispatch(new FreeForAllFixedTickCommand(), {
      mapManager: this.mapManager,
      collisionSystem: this.collisionSystem,
    });
  }
}
