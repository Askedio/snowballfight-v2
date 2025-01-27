import type { MapSchema } from "@colyseus/schema";
import type { TsRoomState } from "./../../states/TsRoomState";
import type { TsRoom } from "./../../rooms/TsRoom";
import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import type { Player } from "../../schemas/Player";
import { BaseTeamFixedTickCommand } from "./BaseTeamFixedTickCommand";

export class TsFixedTickCommand extends BaseTeamFixedTickCommand<
  TsRoom,
  TsRoomState
> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;

  onPlayerDeath(sessionId: string, player: Player, shooter: Player) {
    super.onPlayerDeath(sessionId, player, shooter);

    player.repsawnDisabled = true;

    if (shooter.team === "red") {
      this.room.state.redScore += 1;
    } else if (shooter.team === "blue") {
      this.room.state.blueScore += 1;
    }

    const allRedDead = this.isTeamEliminated(this.state.players, "red");
    const allBlueDead = this.isTeamEliminated(this.state.players, "blue");

    if (allRedDead || allBlueDead) {
      this.state.setRoundEndsAt(1);
    }
  }

  isTeamEliminated(players: MapSchema<Player>, team: string): boolean {
    return Array.from(players.values())
      .filter((player) => player.team === team) // Filter players by team
      .every((player) => player.isDead); // Check if all are dead
  }
}
