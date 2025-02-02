import type { Client } from "colyseus";
import { Room } from "colyseus";
import {
  type TilemapLayersConfig,
  MapManager,
} from "../classes/MapManager";
import { Dispatcher } from "@colyseus/command";
import { OnJoinCommand } from "../commands/OnJoinCommand";
import { OnLeaveCommand } from "../commands/OnLeaveCommand";
import { Collision } from "../classes/Collision";
import type { BaseRoomState } from "../states/BaseRoomState";
import { BotStateManager } from "../classes/BotStateManager";
import { SpatialPartitioningManager } from "../classes/SpatialPartitioningManager";
import { BotManager } from "../classes/BotManager";

export class BaseRoom<TState extends BaseRoomState> extends Room<
  TState,
  { mapManager: MapManager; collisionSystem: Collision }
> {
  // Game configuration
  maxClients: number;
  maxBots: number;
  minPlayers = 1;
  mode: string;

  // Map configuration
  map: string;
  layers: TilemapLayersConfig = {
    base: "base",
    collisions: "collisions",
    land: "Tile Layer 1",
    spawnLayer: "spawns",
  };

  mapManager: MapManager;
  dispatcher = new Dispatcher(this);
  customRoomName: string;
  fixedTimeStep = 1000 / 60;
  collisionSystem: Collision;
  botStateManager: BotStateManager;
  spatialManager = new SpatialPartitioningManager();
  botManager: BotManager;

  async onCreate() {
    this.collisionSystem = new Collision();

    this.botStateManager = new BotStateManager();

    this.mapManager = new MapManager(
      this.map,
      this.layers.collisions,
      this.layers.spawnLayer,
      this.state.players,
      this.collisionSystem
    );

    this.botManager = new BotManager(this.spatialManager, this);
  }

  fixedTick() {}

  async onJoin(client: Client, options: any) {
    this.dispatcher.dispatch(new OnJoinCommand(), {
      client,
      options,
    });
  }

  async onLeave(client: Client) {
    this.dispatcher.dispatch(new OnLeaveCommand(), {
      client,
    });
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
    this.dispatcher.stop();
  }
}
