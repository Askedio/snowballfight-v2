import type { TsRoomState } from "../../states/TsRoomState";
import type { TsRoom } from "../../rooms/TsRoom";
import type { MapManager } from "../../classes/MapManager";
import { BaseTeamOnCreateCommand } from "./BaseTeamOnCreateCommand";
import type { Player } from "../../schemas/Player";

export class TsOnCreateCommand extends BaseTeamOnCreateCommand<
  TsRoom,
  TsRoomState
> {
  mapManager: MapManager;
  maxBots: number;

  onPlayerRespawn(player: Player) {
    if (this.state.roundActive) {
      player.isDead = true;
      player.canJoin = false;
    }
  }
}
