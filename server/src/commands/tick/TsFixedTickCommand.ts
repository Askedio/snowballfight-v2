import type { TsRoomState } from "./../../states/TsRoomState";
import type { TsRoom } from "./../../rooms/TsRoom";
import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import { BaseTickCommand } from "./BaseFixedTickCommand";
import type { Player } from "../../schemas/Player";

export class TsFixedTickCommand extends BaseTickCommand<TsRoom, TsRoomState> {
  tilemapManager: TilemapManager;
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
