import type { BaseTeamOnCreateCommand } from "../commands/create/BaseTeamOnCreateCommand";
import { removeAllPickups, spawnRandomPickups } from "../lib/pickups.lib";
import { assignSpawn } from "../lib/player.lib";
import type { BaseRoom } from "../rooms/BaseRoom";
import type { TeamRoomState } from "../states/TeamRoomState";

export class RoundManager<
  TRoom extends BaseRoom<TState>,
  TState extends TeamRoomState
> {
  private command: BaseTeamOnCreateCommand<TRoom, TState>;

  constructor(command: BaseTeamOnCreateCommand<TRoom, TState>) {
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

    this.command.room.state.players.forEach(async (player: any) => {
      player.isDead = true;
      await assignSpawn(player, this.command.room.tilemapManager);
      this.command.room.broadcast("client-respawned", {
        sessionId: player.sessionId,
      });
    });
  }

  private startRound() {
    removeAllPickups(this.command.room.tilemapManager, this.command.room);
    spawnRandomPickups(this.command.room.tilemapManager, this.command.room);

    this.command.spawnPickups();

    this.command.room.state.redScore = 0;
    this.command.room.state.blueScore = 0;

    this.command.room.state.players.forEach((player: any) => {
      player.reset();
    });

    this.command.room.state.setRoundEndsAt();
    this.setPlayerEnabled(true);
    this.command.room.broadcast("round-started");

    this.command.room.state.waitingToStart = false;
    this.command.room.state.roundStartsAt = "";
    this.command.room.state.roundActive = true;
  }

  private resetPlayers() {
    this.command.room.state.players.forEach((player: any) => {
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
