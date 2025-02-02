import { TdmOnCreateCommand } from "../commands/create/TdmOnCreateCommand";
import { TdmFixedTickCommand } from "../commands/tick/TdmFixedTickCommand";
import { TdmRoomState } from "../states/TdmRoomState";
import { BaseRoom } from "./BaseRoom";

export class TdmRoom extends BaseRoom<TdmRoomState> {
  // Game configuration
  maxClients = 10;
  maxBots = 1;

  // Map configuration
  map = "../client/static/assets/maps/winter/map.json";
  layers = {
    base: "base",
    collisions: "collisions",
    land: "Tile Layer 1",
    spawnLayer: { red: "redspawns", blue: "bluespawns" },
  };

  async onCreate() {
    this.setState(new TdmRoomState());
    super.onCreate();

    this.dispatcher.dispatch(new TdmOnCreateCommand(), {
      mapManager: this.mapManager,
      maxBots: this.maxBots
    });
  }

  fixedTick() {
    this.dispatcher.dispatch(new TdmFixedTickCommand(), {
      mapManager: this.mapManager,
      collisionSystem: this.collisionSystem,
    });
  }
}
