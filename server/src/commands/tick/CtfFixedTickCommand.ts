import { ArraySchema } from "@colyseus/schema";
import type { CtfRoom } from "./../../rooms/CtfRoom";
import type { TilemapManager } from "../../classes/TilemapManager";
import type { Collision } from "../../classes/Collision";
import type { CtfRoomState } from "../../states/CtfRoomState";
import type { Player } from "../../schemas/Player";
import type { Pickup } from "../../schemas/Pickup";
import { BaseTeamFixedTickCommand } from "./BaseTeamFixedTickCommand";
import { PickupFactory } from "../../pickups/PickupFactory";

export class CtfFixedTickCommand extends BaseTeamFixedTickCommand<
  CtfRoom,
  CtfRoomState
> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;

  onPickupColission(player: Player, pickup: Pickup, index: number) {
    super.onPickupColission(player, pickup, index);

    if (["redFlag", "blueFlag"].includes(pickup.type)) {
      const enemyFlag = player.team === "blue" ? "redFlag" : "blueFlag";
      const playerHasFlag = player.pickups.find((p) => p.type === enemyFlag);

      const isScoringFlag =
        pickup.type === (player.team === "red" ? "redFlag" : "blueFlag") &&
        !pickup.wasDropped &&
        playerHasFlag;

      const isRestoringFlag =
        pickup.type === (player.team === "red" ? "redFlag" : "blueFlag") &&
        pickup.wasDropped;

      if (isScoringFlag) {
        player.pickups = new ArraySchema<Pickup>(
          ...player.pickups.filter((p) => p !== playerHasFlag)
        );

        // Update the team's score
        this.room.state[player.team === "red" ? "redScore" : "blueScore"] += 1;

        // Respawn the captured flag at its original position
        this.room.state.pickups.push(
          PickupFactory.createPickup(
            playerHasFlag.type,
            playerHasFlag.originalX,
            playerHasFlag.originalY,
            { ...playerHasFlag, wasDropped: false }
          )
        );
      }

      if (isRestoringFlag) {
        this.room.state.pickups.splice(index, 1); // Remove the pickup


        this.room.state.pickups.push(
          PickupFactory.createPickup(
            pickup.type,
            pickup.originalX,
            pickup.originalY,
            { ...pickup, wasDropped: false }
          )
        );
      }
    }
  }
}
