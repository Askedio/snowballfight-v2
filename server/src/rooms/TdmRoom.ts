import { TdmOnCreateCommand } from "../commands/create/TdmOnCreateCommand";
import { TdmFixedTickCommand } from "../commands/tick/TdmFixedTickCommand";
import { TdmRoomState } from "../states/TdmRoomState";
import { BaseRoom } from "./BaseRoom";

export class TdmRoom extends BaseRoom<TdmRoomState> {
  // Game configuration
  maxClients = 20;
  mode = "tdm";
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
