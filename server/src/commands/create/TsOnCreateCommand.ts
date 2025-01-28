import type { TsRoomState } from "../../states/TsRoomState";
import type { TsRoom } from "../../rooms/TsRoom";
import type { TilemapManager } from "../../classes/TilemapManager";
import { BaseTeamOnCreateCommand } from "./BaseTeamOnCreateCommand";
import type { Player } from "../../schemas/Player";

export class TsOnCreateCommand extends BaseTeamOnCreateCommand<
  TsRoom,
  TsRoomState
> {
  tilemapManager: TilemapManager;
  maxBots: number;

  onPlayerRespawn(player: Player) {
    if (this.state.roundActive) {
      player.isDead = true;
    }
  }
}
