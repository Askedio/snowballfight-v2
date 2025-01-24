import { TsOnCreateCommand } from "../commands/create/TsOnCreateCommand";
import { TsFixedTickCommand } from "../commands/tick/TsFixedTickCommand";
import { TsRoomState } from "../states/TsRoomState";
import { BaseRoom } from "./BaseRoom";

export class TsRoom extends BaseRoom<TsRoomState> {
  // Game configuration
  maxClients = 20;
  mode = "ts";
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
    this.setState(new TsRoomState());
    super.onCreate();

    this.dispatcher.dispatch(new TsOnCreateCommand(), {
      tilemapManager: this.tilemapManager,
      maxBots: this.maxBots
    });
  }

  fixedTick() {
    this.dispatcher.dispatch(new TsFixedTickCommand(), {
      tilemapManager: this.tilemapManager,
      collisionSystem: this.collisionSystem,
    });
  }
}
