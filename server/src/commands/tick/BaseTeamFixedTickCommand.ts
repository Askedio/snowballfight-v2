import { BaseTickCommand } from "./BaseFixedTickCommand";
import { getTotalReadyPlayers } from "../../lib/room.lib";
import type { Player } from "../../schemas/Player";
import { assignSpawn } from "../../lib/player.lib";
import type { Pickup } from "../../schemas/Pickup";
import { removeAllPickups, spawnRandomPickups } from "../../lib/pickups.lib";
import type { BaseRoom } from "../../rooms/BaseRoom";
import type { TeamRoomState } from "../../states/TeamRoomState";
import type { Bullet } from "../../schemas/Bullet";

export class BaseTeamFixedTickCommand<
  TRoom extends BaseRoom<TState>,
  TState extends TeamRoomState
> extends BaseTickCommand<TRoom, TState> {
  execute(payload: this["payload"]) {
    super.execute(payload);

    const totalReadyPlayers = getTotalReadyPlayers(this.state.players);
    //console.log({totalReadyPlayers})
    //Math.round((this.room.clients.length + this.room.maxBots) / 2))

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

          await assignSpawn(player, this.tilemapManager); // Respawn at a new position

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
          removeAllPickups(this.tilemapManager, this.room);
          spawnRandomPickups(this.tilemapManager, this.room);

          this.spawnPickups();

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

  spawnPickups() {}

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

  onPickupDroppedOff(player: Player, pickup: Pickup) {
    super.onPickupDroppedOff(player, pickup);

    if (pickup.type === "redFlag" && player.team === "blue") {
      this.room.state.blueScore += 1;
    }

    if (pickup.type === "blueFlag" && player.team === "red") {
      this.room.state.redScore += 1;
    }

    player.score += 1;

    return {
      restorePickup: true,
    };
  }

  onBulletHit(
    sessionId: string,
    bullet: Bullet,
    player: Player,
    shooter: Player
  ) {
    if (shooter.team === player.team) {
      return;
    }

    super.onBulletHit(sessionId, bullet, player, shooter);
  }
}
