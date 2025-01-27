import type { CtfRoom } from "./../../rooms/CtfRoom";
import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import { BaseTickCommand } from "./BaseFixedTickCommand";
import type { CtfRoomState } from "../../states/CtfRoomState";
import { getTotalReadyPlayers } from "../../lib/room.lib";
import type { Player } from "../../schemas/Player";
import { assignRandomPosition } from "../../lib/player.lib";

export class CtfFixedTickCommand extends BaseTickCommand<
  CtfRoom,
  CtfRoomState
> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;

  execute(payload: this["payload"]) {
    super.execute(payload);

    const totalReadyPlayers = getTotalReadyPlayers(this.state.players);

    // Round is active.
    if (this.state.roundActive) {
      // A bit heavy to constantly update all players..
      this.setPlayerEnabled(true);

      // Round is active but we lost the number of players required to play, abort match.
      if (totalReadyPlayers <= 1) {
        this.abortMatch();
      }

      const endTime = new Date(this.state.roundEndsAt).getTime();
      const now = Date.now();
      const timeLeft = endTime - now;

      // Round time limit has been hit
      if (timeLeft <= 0) {
        this.setPlayerUnready();
        this.state.roundActive = false;

        this.room.broadcast("round-over", {
          redScore: this.state.redScore,
          blueScore: this.state.blueScore,
        });

        this.state.players.forEach(async (player) => {
          player.isDead = true;
          await assignRandomPosition(player, this.tilemapManager); // Respawn at a new position

          this.room.broadcast("client-respawned", {
            sessionId: player.sessionId,
          });
        });
      }
    } else {
      this.setPlayerEnabled(false);

      if (this.state.waitingToStart) {
        this.state.players.forEach((player) => {
          player.isDead = false;
        });

        if (totalReadyPlayers <= 1) {
          this.abortMatch();
        }

        const endTime = new Date(this.state.roundStartsAt).getTime();
        const now = Date.now();
        const timeLeft = endTime - now;

        // Start round!
        if (timeLeft <= 0) {
          this.state.redScore = 0;
          this.state.blueScore = 0;

          this.state.players.forEach(async (player) => {
            player.reset();
          });

          this.state.setRoundEndsAt();
          this.setPlayerEnabled(true);
          this.room.broadcast("round-started");

          this.state.waitingToStart = false;
          this.state.roundStartsAt = "";
          this.state.roundActive = true;
        }
      } else {
        if (totalReadyPlayers >= 2) {
          this.state.waitingForPlayers = false;
          this.state.setRoundStartsAt();
          this.state.waitingToStart = true;
        }
      }
    }
  }

  onPlayerDeath(sessionId: string, player: Player, shooter: Player) {
    super.onPlayerDeath(sessionId, player, shooter);

    if (shooter.team === "red") {
      this.room.state.redScore += 1;
    } else if (shooter.team === "blue") {
      this.room.state.blueScore += 1;
    }
  }

  abortMatch() {
    if (this.state.waitingToStart) {
      return;
    }

    this.state.waitingToStart = true;
    this.state.roundActive = false;
    this.state.roundStartsAt = "";
    this.state.roundStartsAt = "";

    this.setPlayerUnready();
    this.setPlayerEnabled(false);

    this.room.broadcast("round-over", {
      redScore: this.state.redScore,
      blueScore: this.state.blueScore,
    });
  }

  setPlayerEnabled(enabled: boolean) {
    this.state.players.forEach((player) => {
      player.enabled = enabled;
    });
  }

  setPlayerUnready() {
    this.state.players.forEach((player) => {
      if (player.type === "bot") {
        return;
      }

      player.isReady = false;
    });

    this.state.waitingForPlayers = true;
  }
}
