import type { Client } from "colyseus";
import { Room } from "colyseus";
import { TilemapManager } from "../TilemapManager";
import { Dispatcher } from "@colyseus/command";
import { OnJoinCommand } from "../commands/OnJoinCommand";
import type { MyRoomState } from "../states/MyRoomState";
import { OnLeaveCommand } from "../commands/OnLeaveCommand";
import { OnCreateCommand } from "../commands/OnCreateCommand";
import { FixedTickCommand } from "../commands/FixedTickCommand";

export class Part4Room extends Room<MyRoomState> {
  dispatcher = new Dispatcher(this);
  private tilemapManager: TilemapManager;

  customRoomName: string;

  fixedTimeStep = 1000 / 60;

  async onCreate(options: any) {
    const mapFilePath = "../client/static/assets/maps/winter/map.json"; // Update with the correct path
    const collisionLayerName = "Colissins";
    const spawnLayerName = "spawns";
    this.tilemapManager = new TilemapManager(
      mapFilePath,
      collisionLayerName,
      spawnLayerName
    );

    this.dispatcher.dispatch(new OnCreateCommand(), {
      tilemapManager: this.tilemapManager,
    });
  }

  fixedTick(timeStep: number) {
    this.dispatcher.dispatch(new FixedTickCommand(), {
      tilemapManager: this.tilemapManager,
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
