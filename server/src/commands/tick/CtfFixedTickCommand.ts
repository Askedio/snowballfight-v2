import type { CtfRoom } from "./../../rooms/CtfRoom";
import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import type { CtfRoomState } from "../../states/CtfRoomState";
import type { Player } from "../../schemas/Player";
import type { Pickup } from "../../schemas/Pickup";
import {
  spawnPickupFromObjectLayer,
} from "../../lib/pickups.lib";
import { BaseTeamFixedTickCommand } from "./BaseTeamFixedTickCommand";

export class CtfFixedTickCommand extends BaseTeamFixedTickCommand<
  CtfRoom,
  CtfRoomState
> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;

  onPickupDroppedOff(player: Player, pickup: Pickup) {
    super.onPickupDroppedOff(player, pickup);

    if (pickup.type === "redFlag" && player.team === "blue") {
      this.room.state.blueScore += 1;
    }

    if (pickup.type === "blueFlag" && player.team === "red") {
      this.room.state.redScore += 1;
    }

    player.score += 1;

    return {
      restorePickup: true,
    };
  }

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
