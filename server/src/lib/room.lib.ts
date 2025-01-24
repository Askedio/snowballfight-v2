import type { MapSchema } from "@colyseus/schema";
import type { Player } from "../schemas/Player";

export function getTotalAlivePlayers(players: MapSchema<Player, string>) {
  return Array.from(players.values()).filter((player) => !player.isDead).length;
}

export function getTotalReadyPlayers(players: MapSchema<Player, string>) {
    return Array.from(players.values()).filter((player) => player.isReady).length;
  }
  