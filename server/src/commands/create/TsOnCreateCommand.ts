import type { TsRoomState } from "../../states/TsRoomState";
import type { TsRoom } from "../../rooms/TsRoom";
import type { TilemapManager } from "../../TilemapManager";
import { BaseOnCreateCommand } from "./BaseOnCreateCommand";
import type { Client } from "colyseus";
import { assignTeam } from "../../lib/teams.lib";

export class TsOnCreateCommand extends BaseOnCreateCommand<
  TsRoom,
  TsRoomState
> {
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
