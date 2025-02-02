import type { BaseOnCreateCommand } from "../commands/create/BaseOnCreateCommand";
import type { BaseRoom } from "../rooms/BaseRoom";
import type { Player } from "../schemas/Player";
import type { BaseRoomState } from "../states/BaseRoomState";

export class RoundManager<
  TRoom extends BaseRoom<TState>,
  TState extends BaseRoomState
> {
  private command: BaseOnCreateCommand<TRoom, TState>;

  constructor(command: BaseOnCreateCommand<TRoom, TState>) {
    this.command = command;
  }

  /**
   * Updates the round state, deciding whether to handle an active or inactive round.
   */
  updateRoundState() {
    const totalReadyPlayers = this.getTotalReadyPlayers();

    if (this.command.room.state.roundActive) {
      this.handleActiveRound(totalReadyPlayers);
    } else {
      this.handleInactiveRound(totalReadyPlayers);
    }
  }

  /**
   * Handles the logic for an active round.
   */
  private handleActiveRound(totalReadyPlayers: number) {
    this.setPlayerEnabled(true);

    if (totalReadyPlayers <= 1) {
      // this.abortMatch();
      // return;
    }

    const timeLeft = this.getTimeLeft(this.command.room.state.roundEndsAt);

    if (timeLeft <= 0) {
      this.endRound();
    }
  }

  /**
   * Handles the logic for an inactive round.
   */
  private handleInactiveRound(totalReadyPlayers: number) {
    this.setPlayerEnabled(false);

    if (this.command.room.state.waitingToStart) {
      this.resetPlayers();

      if (totalReadyPlayers <= 1) {
        this.abortMatch();
        return;
      }

      const timeLeft = this.getTimeLeft(this.command.room.state.roundStartsAt);

      if (timeLeft <= 0) {
        this.startRound();
      }
    } else {
      if (totalReadyPlayers >= 2) {
        this.command.room.state.waitingForPlayers = false;
        this.command.room.state.setRoundStartsAt();
        this.command.room.state.waitingToStart = true;
      }
    }
  }

  /**
   * Other helper methods remain unchanged
   */
  private getTotalReadyPlayers(): number {
    if (!this.command.room.state.requiresReady) {
      return Array.from(this.command.room.state.players.values()).length;
    }

    return Array.from(this.command.room.state.players.values()).filter(
      (player) => player.isReady
    ).length;
  }

  private setPlayerEnabled(enabled: boolean) {
    this.command.room.state.players.forEach((player) => {
      player.enabled = enabled;
    });
  }

  private setPlayerUnready() {
    if (!this.command.room.state.requiresReady) {
      this.command.room.state.waitingForPlayers = false;
      return;
    }

    this.command.room.state.players.forEach((player) => {
      if (player.type === "bot") return;
      player.isReady = false;
    });

    this.command.room.state.waitingForPlayers = true;
  }

  private getTimeLeft(timestamp: string): number {
    const endTime = new Date(timestamp).getTime();
    const now = Date.now();
    return endTime - now;
  }

  private endRound() {
    this.setPlayerUnready();
    this.command.room.state.roundActive = false;

    this.command.room.broadcast("round-over", {
      redScore: this.command.room.state.redScore,
      blueScore: this.command.room.state.blueScore,
    });

    this.command.room.state.players.forEach(async (player: Player) => {
      player.isDead = true;
      player.canJoin = true;

      this.command.room.broadcast("client-respawned", {
        sessionId: player.sessionId,
      });
    });
  }

   startRound() {
    this.command.spawnPickups();

    this.command.room.state.redScore = 0;
    this.command.room.state.blueScore = 0;

    this.command.room.state.players.forEach((player: Player) => {
      player.respawn(this.command.mapManager);
    });

    this.command.room.state.setRoundEndsAt();
    this.setPlayerEnabled(true);
    this.command.room.broadcast("round-started");

    this.command.room.state.waitingToStart = false;
    this.command.room.state.roundStartsAt = "";
    this.command.room.state.roundActive = true;
  }

  private resetPlayers() {
    this.command.room.state.players.forEach((player: Player) => {
      player.isDead = false;
    });
  }

  private abortMatch() {
    // this.command.room.broadcast("match-aborted");
    this.command.room.state.roundActive = false;
    this.command.room.state.waitingToStart = false;
    this.setPlayerUnready();
  }
}
