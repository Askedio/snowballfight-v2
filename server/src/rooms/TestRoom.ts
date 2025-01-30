import { TestRoomOnCreateCommand } from "../commands/create/TestRoomOnCreateCommand";
import { FreeForAllFixedTickCommand } from "../commands/tick/FreeForAllFixedTickCommand";
import { TestRoomState } from "../states/TestRoomState";
import { BaseRoom } from "./BaseRoom";

export class TestRoom extends BaseRoom<TestRoomState> {
  // Game configuration
  maxClients = 10;
  maxBots = 1;

  // Map configuration
  map = "../client/static/assets/maps/winter/map.json";
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
      tilemapManager: this.tilemapManager,
      maxBots: this.maxBots,
    });
  }

  fixedTick() {
    this.dispatcher.dispatch(new FreeForAllFixedTickCommand(), {
      tilemapManager: this.tilemapManager,
      collisionSystem: this.collisionSystem,
    });
  }
}
