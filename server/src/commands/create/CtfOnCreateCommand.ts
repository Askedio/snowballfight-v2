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

  async execute(payload: this["payload"]) {
    super.execute(payload);

    this.room.onMessage(
      "player-ready",
      async (client, { ready }: { ready: boolean }) => {
        // Check if the player exists in the room state
        const player = this.room.state.players.get(client.sessionId);

        if (player) {
          player.isReady = ready;
        }
      }
    );
  }

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
