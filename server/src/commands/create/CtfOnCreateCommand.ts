import type { TilemapManager } from "../../TilemapManager";
import { BaseOnCreateCommand } from "./BaseOnCreateCommand";
import type { CtfRoomState } from "../../states/CtfRoomState";
import type { CtfRoom } from "../../rooms/CtfRoom";
import type { Client } from "colyseus";
import { assignTeam } from "../../lib/teams.lib";

export class CtfOnCreateCommand extends BaseOnCreateCommand<
  CtfRoom,
  CtfRoomState
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
