import type { TdmRoomState } from "./../../states/TdmRoomState";
import type { TdmRoom } from "./../../rooms/TdmRoom";
import type { TilemapManager } from "../../TilemapManager";
import { BaseOnCreateCommand } from "./BaseOnCreateCommand";
import type { Client } from "colyseus";
import { assignTeam } from "../../lib/teams.lib";

export class TdmOnCreateCommand extends BaseOnCreateCommand<TdmRoom, TdmRoomState> {
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
