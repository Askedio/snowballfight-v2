import type { TilemapManager } from "../../classes/TilemapManager";
import type { CtfRoomState } from "../../states/CtfRoomState";
import type { CtfRoom } from "../../rooms/CtfRoom";
import { BaseTeamOnCreateCommand } from "./BaseTeamOnCreateCommand";

export class CtfOnCreateCommand extends BaseTeamOnCreateCommand<
  CtfRoom,
  CtfRoomState
> {
  tilemapManager: TilemapManager;
  maxBots: number;

  spawnPickups() {
    super.spawnPickups();
    
    // Spawn the red flag
    this.pickupManager.spawnPickupFromObjectLayer(
      this.room,
      "flags",
      "redFlag",
      "redFlag"
    );

    // Spawn the blue flag
    this.pickupManager.spawnPickupFromObjectLayer(
      this.room,
      "flags",
      "blueFlag",
      "blueFlag"
    );
  }
}
