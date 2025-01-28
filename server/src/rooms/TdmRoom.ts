import { TdmOnCreateCommand } from "../commands/create/TdmOnCreateCommand";
import { TdmFixedTickCommand } from "../commands/tick/TdmFixedTickCommand";
import { TdmRoomState } from "../states/TdmRoomState";
import { BaseRoom } from "./BaseRoom";

export class TdmRoom extends BaseRoom<TdmRoomState> {
  // Game configuration
  maxClients = 10;
  mode = "tdm";
  scoring = "kills";
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
    this.setState(new TdmRoomState());
    super.onCreate();

    this.dispatcher.dispatch(new TdmOnCreateCommand(), {
      tilemapManager: this.tilemapManager,
      maxBots: this.maxBots
    });
  }

  fixedTick() {
    this.dispatcher.dispatch(new TdmFixedTickCommand(), {
      tilemapManager: this.tilemapManager,
      collisionSystem: this.collisionSystem,
    });
  }
}
