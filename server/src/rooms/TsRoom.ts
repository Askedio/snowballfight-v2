import { TsOnCreateCommand } from "../commands/create/TsOnCreateCommand";
import { TsFixedTickCommand } from "../commands/tick/TsFixedTickCommand";
import { TsRoomState } from "../states/TsRoomState";
import { BaseRoom } from "./BaseRoom";

export class TsRoom extends BaseRoom<TsRoomState> {
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
    this.setState(new TsRoomState());
    super.onCreate();

    this.dispatcher.dispatch(new TsOnCreateCommand(), {
      mapManager: this.mapManager,
      maxBots: this.maxBots
    });
  }

  fixedTick() {
    this.dispatcher.dispatch(new TsFixedTickCommand(), {
      mapManager: this.mapManager,
      collisionSystem: this.collisionSystem,
    });
  }
}
