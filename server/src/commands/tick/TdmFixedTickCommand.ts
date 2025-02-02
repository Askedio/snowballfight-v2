import type { MapManager } from "../../classes/MapManager";
import type { Collision } from "../../classes/Collision";
import type { TdmRoom } from "../../rooms/TdmRoom";
import type { Player } from "../../schemas/Player";
import type { TdmRoomState } from "../../states/TdmRoomState";
import { BaseTeamFixedTickCommand } from "./BaseTeamFixedTickCommand";

export class TdmFixedTickCommand extends BaseTeamFixedTickCommand<
  TdmRoom,
  TdmRoomState
> {
  mapManager: MapManager;
  collisionSystem: Collision;

  onPlayerDeath(sessionId: string, player: Player, shooter: Player) {
    super.onPlayerDeath(sessionId, player, shooter);

    if (shooter.team === "red") {
      this.room.state.redScore += 1;
    } else if (shooter.team === "blue") {
      this.room.state.blueScore += 1;
    }
  }
}
