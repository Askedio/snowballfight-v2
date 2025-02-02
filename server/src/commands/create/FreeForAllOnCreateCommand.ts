import type { FreeForAllRoomState } from "./../../states/FreeForAllRoomState";
import type { FreeForAllRoom } from "./../../rooms/FreeForAllRoom";
import type { MapManager } from "../../classes/MapManager";
import { BaseOnCreateCommand } from "./BaseOnCreateCommand";
import { RoundManager } from "../../classes/RoundManager";
import type { Delayed } from "colyseus";

export class FreeForAllOnCreateCommand extends BaseOnCreateCommand<
  FreeForAllRoom,
  FreeForAllRoomState
> {
  mapManager: MapManager;
  maxBots: number;
  private roundManager: RoundManager<FreeForAllRoom, FreeForAllRoomState>;
  public delayedInterval!: Delayed;

  constructor() {
    super();

    this.roundManager = new RoundManager(this);
  }

  async execute(payload: this["payload"]) {
    super.execute(payload);

    this.roundManager.startRound();

    this.room.clock.setInterval(() => {
      this.roundManager.updateRoundState();
    }, 1000);
  }
}
