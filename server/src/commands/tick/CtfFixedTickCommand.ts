import type { CtfRoom } from "./../../rooms/CtfRoom";
import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import type { CtfRoomState } from "../../states/CtfRoomState";
import type { Player } from "../../schemas/Player";
import type { Pickup } from "../../schemas/Pickup";
import { BaseTeamFixedTickCommand } from "./BaseTeamFixedTickCommand";

export class CtfFixedTickCommand extends BaseTeamFixedTickCommand<
  CtfRoom,
  CtfRoomState
> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;

  onPickupColission(player: Player, pickup: Pickup) {
    super.onPickupDroppedOff(player, pickup);
    let restorePickup = false;

    if (
      pickup.type === "redFlag" &&
      player.team === "red" &&
      pickup.wasDropped
    ) {
      restorePickup = true;
    }

    if (
      pickup.type === "blueFlag" &&
      player.team === "blue" &&
      pickup.wasDropped
    ) {
      restorePickup = true;
    }

    return {
      restorePickup,
    };
  }

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
}
