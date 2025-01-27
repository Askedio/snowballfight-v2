import type { Client } from "colyseus";
import type { BaseRoom } from "../../rooms/BaseRoom";
import type { BaseRoomState } from "../../states/BaseRoomState";
import { BaseOnCreateCommand } from "./BaseOnCreateCommand";
import { assignTeam } from "../../lib/teams.lib";

export class BaseTeamOnCreateCommand<
  TRoom extends BaseRoom<TState>,
  TState extends BaseRoomState
> extends BaseOnCreateCommand<TRoom, TState> {
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
