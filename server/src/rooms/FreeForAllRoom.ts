import type { Client } from "colyseus";
import { Room } from "colyseus";
import { TilemapManager } from "../TilemapManager";
import { Dispatcher } from "@colyseus/command";
import { OnJoinCommand } from "../commands/OnJoinCommand";
import { FreeForAllRoomState } from "../states/FreeForAllRoomState";
import { OnLeaveCommand } from "../commands/OnLeaveCommand";
import { OnCreateCommand } from "../commands/OnCreateCommand";
import { FixedTickCommand } from "../commands/FixedTickCommand";
import { Collision } from "../classes/Collision";

export class FreeForAllRoom extends Room<FreeForAllRoomState> {
  // Game configuration
  maxClients = 20
  maxBots = 3;

  mode = "ffa";
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

  tilemapManager: TilemapManager;
  dispatcher = new Dispatcher(this);
  customRoomName: string;
  fixedTimeStep = 1000 / 60;
  collisionSystem: Collision;

  async onCreate(options: any) {
    this.setState(new FreeForAllRoomState());

    this.collisionSystem = new Collision();

    this.tilemapManager = new TilemapManager(
      this.map,
      this.layers.colissions,
      this.layers.spawnLayer,
      this.state.players
    );

    this.dispatcher.dispatch(new OnCreateCommand(), {
      tilemapManager: this.tilemapManager,
      maxBots: this.maxBots
    });
  }

  fixedTick(timeStep: number) {
    this.dispatcher.dispatch(new FixedTickCommand(), {
      tilemapManager: this.tilemapManager,
      collisionSystem: this.collisionSystem,
    });
  }

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
