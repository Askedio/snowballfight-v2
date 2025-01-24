import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import { BaseTickCommand } from "./BaseFixedTickCommand";
import type { TdmRoom } from "../../rooms/TdmRoom";
import type { Player } from "../../schemas/Player";
import type { TdmRoomState } from "../../states/TdmRoomState";

export class TdmFixedTickCommand extends BaseTickCommand<TdmRoom, TdmRoomState> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;

  onPlayerDeath(sessionId: string, player: Player, shooter: Player) {
    super.onPlayerDeath(sessionId, player, shooter);

    this.room.state.redScore
  }
}
