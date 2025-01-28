import type { Client } from "colyseus";
import { Room } from "colyseus";
import { type TilemapLayersConfig, TilemapManager } from "../classes/TilemapManager";
import { Dispatcher } from "@colyseus/command";
import { OnJoinCommand } from "../commands/OnJoinCommand";
import { OnLeaveCommand } from "../commands/OnLeaveCommand";
import { Collision } from "../classes/Collision";
import type { BaseRoomState } from "../states/BaseRoomState";



export class BaseRoom<TState extends BaseRoomState> extends Room<
  TState,
  { tilemapManager: TilemapManager; collisionSystem: Collision }
> {
  // Game configuration
  maxClients: number;
  maxBots: number;

  mode: string;
  scoring: string;
  teams: boolean;

  // Map configuration
  map: string;
  layers: TilemapLayersConfig = {
    base: "base",
    collisions: "collisions",
    land: "Tile Layer 1",
    spawnLayer: "spawns",
  };

  tilemapManager: TilemapManager;
  dispatcher = new Dispatcher(this);
  customRoomName: string;
  fixedTimeStep = 1000 / 60;
  collisionSystem: Collision;

  async onCreate() {
    this.collisionSystem = new Collision();

    this.tilemapManager = new TilemapManager(
      this.map,
      this.layers.collisions,
      this.layers.spawnLayer,
      this.state.players
    );
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
