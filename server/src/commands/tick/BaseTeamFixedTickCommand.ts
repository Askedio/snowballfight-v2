import { BaseTickCommand } from "./BaseFixedTickCommand";
import type { Player } from "../../schemas/Player";
import type { Pickup } from "../../schemas/Pickup";
import type { BaseRoom } from "../../rooms/BaseRoom";
import type { TeamRoomState } from "../../states/TeamRoomState";
import type { Bullet } from "../../schemas/Bullet";

export class BaseTeamFixedTickCommand<
  TRoom extends BaseRoom<TState>,
  TState extends TeamRoomState
> extends BaseTickCommand<TRoom, TState> {
  execute(payload: this["payload"]) {
    super.execute(payload);
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

  onBulletHit(
    sessionId: string,
    bullet: Bullet,
    player: Player,
    shooter: Player
  ) {
    if (shooter.team === player.team) {
      return;
    }

    super.onBulletHit(sessionId, bullet, player, shooter);
  }
}
