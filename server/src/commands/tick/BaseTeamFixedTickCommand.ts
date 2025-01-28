import { BaseTickCommand } from "./BaseFixedTickCommand";
import type { Player } from "../../schemas/Player";
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
