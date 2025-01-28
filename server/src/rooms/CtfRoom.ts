import { CtfOnCreateCommand } from "../commands/create/CtfOnCreateCommand";
import { CtfFixedTickCommand } from "../commands/tick/CtfFixedTickCommand";
import { CtfRoomState } from "../states/CtfRoomState";
import type { TilemapLayersConfig } from "../TilemapManager";
import { BaseRoom } from "./BaseRoom";

export class CtfRoom extends BaseRoom<CtfRoomState> {
  // Game configuration
  maxClients = 10;
  mode = "ctf";
  scoring = "kills";
  maxBots = 1;

  // Map configuration
  map = "../client/static/assets/maps/winter/map.json";
  layers: TilemapLayersConfig = {
    base: "base",
    collisions: "collisions",
    land: "Tile Layer 1",
    spawnLayer: { red: "redspawns", blue: "bluespawns" },
  };

  async onCreate() {
    this.setState(new CtfRoomState());
    super.onCreate();

    this.dispatcher.dispatch(new CtfOnCreateCommand(), {
      tilemapManager: this.tilemapManager,
      maxBots: this.maxBots,
    });
  }

  fixedTick() {
    this.dispatcher.dispatch(new CtfFixedTickCommand(), {
      tilemapManager: this.tilemapManager,
      collisionSystem: this.collisionSystem,
    });
  }
}
