import type { BaseRoom } from "../../rooms/BaseRoom";
import { BaseOnCreateCommand } from "./BaseOnCreateCommand";
import { assignTeam } from "../../lib/teams.lib";
import type { Player } from "../../schemas/Player";
import type { Delayed } from "colyseus";
import { RoundManager } from "../../classes/RoundManager";
import type { TeamRoomState } from "../../states/TeamRoomState";

export class BaseTeamOnCreateCommand<
  TRoom extends BaseRoom<TState>,
  TState extends TeamRoomState
> extends BaseOnCreateCommand<TRoom, TState> {
  public delayedInterval!: Delayed;

  private roundManager: RoundManager<TRoom, TState>;

  constructor() {
    super();

    this.roundManager = new RoundManager(this);
  }

  async execute(payload: this["payload"]) {
    super.execute(payload);

    this.room.clock.setInterval(() => {
      this.roundManager.updateRoundState();
    }, 1000);

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

  onCreatePlayer(player: Player) {
    assignTeam(player, this.room.state.players);
  }

  spawnPickups() {}
}
