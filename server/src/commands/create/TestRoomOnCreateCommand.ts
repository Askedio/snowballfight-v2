import type { FreeForAllRoomState } from "../../states/FreeForAllRoomState";
import type { FreeForAllRoom } from "../../rooms/FreeForAllRoom";
import type { TilemapManager } from "../../classes/TilemapManager";
import { BaseOnCreateCommand } from "./BaseOnCreateCommand";
import { RoundManager } from "../../classes/RoundManager";
import type { Delayed } from "colyseus";

export class TestRoomOnCreateCommand extends BaseOnCreateCommand<
  FreeForAllRoom,
  FreeForAllRoomState
> {
  tilemapManager: TilemapManager;
  maxBots: number;
  private roundManager: RoundManager<FreeForAllRoom, FreeForAllRoomState>;
  public delayedInterval!: Delayed;

  constructor() {
    super();

    //this.roundManager = new RoundManager(this);
  }

  async execute(payload: this["payload"]) {
    super.execute(payload);

    this.room.clock.setInterval(() => {
      //this.roundManager.updateRoundState();
    }, 1000);
  }
}
