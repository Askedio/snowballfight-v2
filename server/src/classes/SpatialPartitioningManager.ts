import type { ArraySchema } from "@colyseus/schema";
import RBush from "rbush";
import type { Bullet } from "../schemas/Bullet";
import type { Pickup } from "../schemas/Pickup";
import type { Player } from "../schemas/Player";

export class SpatialPartitioningManager {
  bulletIndex: RBush<any>;
  pickupIndex: RBush<any>;
  playerIndex: RBush<any>;

  constructor() {
    this.bulletIndex = new RBush();
    this.pickupIndex = new RBush();
    this.playerIndex = new RBush();
  }

  /**
   * Inserts bullets into the RBush index.
   */
  updateBulletsIndex(bullets: ArraySchema<Bullet>) {
    this.bulletIndex.clear();
    const bulletItems = bullets.map((bullet) => ({
      minX: bullet.x - 5, // Adjust for bullet size
      minY: bullet.y - 5,
      maxX: bullet.x + 5,
      maxY: bullet.y + 5,
      bullet,
    }));
    this.bulletIndex.load(bulletItems);
  }

  /**
   * Inserts pickups into the RBush index.
   */
  updatePickupsIndex(pickups: ArraySchema<Pickup>) {
    this.pickupIndex.clear();
    const pickupItems = pickups.map((pickup) => ({
      minX: pickup.x - pickup.radius,
      minY: pickup.y - pickup.radius,
      maxX: pickup.x + pickup.radius,
      maxY: pickup.y + pickup.radius,
      pickup,
    }));
    this.pickupIndex.load(pickupItems);
  }

  /**
   * Inserts players into the RBush index.
   */
  updatePlayersIndex(players: Player[]) {
    this.playerIndex.clear();
    const playerItems = players.map((player) => ({
      minX: player.x - player.hitRadius,
      minY: player.y - player.hitRadius,
      maxX: player.x + player.hitRadius,
      maxY: player.y + player.hitRadius,
      player,
    }));
    this.playerIndex.load(playerItems);
  }

  /**
   * Query nearby objects using the RBush index.
   */
  queryNearbyObjects(x: number, y: number, radius: number, index: RBush<any>) {
    return index.search({
      minX: x - radius,
      minY: y - radius,
      maxX: x + radius,
      maxY: y + radius,
    });
  }
}
