import type { TilemapManager } from "../../classes/TilemapManager";
import type { CtfRoomState } from "../../states/CtfRoomState";
import type { CtfRoom } from "../../rooms/CtfRoom";
import { BaseTeamOnCreateCommand } from "./BaseTeamOnCreateCommand";
import { spawnPickupFromObjectLayer } from "../../lib/pickups.lib";

export class CtfOnCreateCommand extends BaseTeamOnCreateCommand<
  CtfRoom,
  CtfRoomState
> {
  tilemapManager: TilemapManager;
  maxBots: number;

  spawnPickups() {
    // Spawn the red flag
    spawnPickupFromObjectLayer(
      this.tilemapManager,
      this.room,
      "flags",
      "redFlag",
      "redFlag"
    );

    // Spawn the blue flag
    spawnPickupFromObjectLayer(
      this.tilemapManager,
      this.room,
      "flags",
      "blueFlag",
      "blueFlag"
    );
  }
}
