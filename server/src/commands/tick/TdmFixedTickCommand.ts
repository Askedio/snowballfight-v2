import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import { BaseTickCommand } from "./BaseFixedTickCommand";
import type { TdmRoom } from "../../rooms/TdmRoom";
import type { Player } from "../../schemas/Player";

export class TdmFixedTickCommand extends BaseTickCommand<TdmRoom> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;

  onPlayerDeath(sessionId: string, player: Player, shooter: Player) {
    super.onPlayerDeath(sessionId, player, shooter);

    //this.room.state.redScore
  }
}
