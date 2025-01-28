import type { TdmRoomState } from "./../../states/TdmRoomState";
import type { TdmRoom } from "./../../rooms/TdmRoom";
import type { TilemapManager } from "../../classes/TilemapManager";
import type { Client } from "colyseus";
import { assignTeam } from "../../lib/teams.lib";
import { BaseTeamOnCreateCommand } from "./BaseTeamOnCreateCommand";

export class TdmOnCreateCommand extends BaseTeamOnCreateCommand<TdmRoom, TdmRoomState> {
  tilemapManager: TilemapManager;
  maxBots: number;

  async createPlayer(
    client: Client,
    skin: string,
    type: "human" | "bot" = "human"
  ) {
    const player = await super.createPlayer(client, skin, type);

    assignTeam(player, this.room.state.players);

    return player;
  }
}
