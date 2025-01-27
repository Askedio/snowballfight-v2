import type { MapSchema } from "@colyseus/schema";
import type { Player } from "../schemas/Player";

export function assignTeam(player: Player, players: MapSchema<Player, string>) {
  let redCount = 0;
  let blueCount = 0;

  players.forEach((_) => {
    if (_.team === "red") {
      redCount += 1;
    } else if (_.team === "blue") {
      blueCount += 1;
    }
  });

  if (redCount <= blueCount) {
    player.team = "red";
    player.skin = "playersb";
  } else {
    player.team = "blue";
    player.skin = "playersd";
  }

  console.log(player.name, player.skin)
}
