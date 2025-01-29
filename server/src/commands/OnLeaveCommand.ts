import { Command } from "@colyseus/command";
import type { Client } from "colyseus";
import type { BaseRoom } from "../rooms/BaseRoom";
import type { BaseRoomState } from "../states/BaseRoomState";
import type { Player } from "../schemas/Player";

// When a client leaves
export class OnLeaveCommand extends Command<
  BaseRoom<BaseRoomState>,
  { client: Client }
> {
  execute(payload: this["payload"]) {
    const { client } = payload;

    console.log(client.sessionId, "left!");

    this.state.players.delete(client.sessionId);

    if (this.state.teamScoring) {
      this.autoBalanceTeams();
    }
    return;
  }

  autoBalanceTeams() {
    const redTeam: Player[] = [];
    const blueTeam: Player[] = [];

    // Sort players into teams
    this.state.players.forEach((player) => {
      if (player.team === "red") {
        redTeam.push(player);
      } else if (player.team === "blue") {
        blueTeam.push(player);
      }
    });

    // If the teams are already balanced, return
    if (Math.abs(redTeam.length - blueTeam.length) <= 1) {
      return;
    }

    console.log("Auto balacing teams.");

    // Identify the team that has more players
    const teamToMoveFrom =
      redTeam.length > blueTeam.length ? redTeam : blueTeam;
    const teamToMoveTo = redTeam.length > blueTeam.length ? blueTeam : redTeam;
    const newTeam = redTeam.length > blueTeam.length ? "blue" : "red";

    // Sort players in the larger team by score (ascending)
    teamToMoveFrom.sort((a, b) => a.score - b.score);

    // Move lowest-scoring players until teams are balanced
    while (teamToMoveFrom.length > teamToMoveTo.length + 1) {
      const playerToMove = teamToMoveFrom.shift();
      if (playerToMove) {
        playerToMove.team = newTeam;
        teamToMoveTo.push(playerToMove);
      }
    }
  }
}
