import type { MapSchema, ArraySchema } from "@colyseus/schema";
import type { InputData } from "../interfaces/InputData";
import type { Player } from "../schemas/Player";
import type { Pickup } from "../schemas/Pickup";
import type { Pathfinding } from "./Pathfinding";
import type { SpatialPartitioningManager } from "./SpatialPartitioningManager";

const healthPickup = "treasure";
const ammoPickup = "devil";

export class BotManager {
  private players: MapSchema<Player, string>;
  private pickups: ArraySchema<Pickup>;
  private pathfinding: Pathfinding;
  private spatialManager: SpatialPartitioningManager;

  constructor(
    players: MapSchema<Player, string>,
    pickups: ArraySchema<Pickup>,
    pathfinding: Pathfinding,
    spatialManager: SpatialPartitioningManager
  ) {
    this.players = players;
    this.pickups = pickups;
    this.pathfinding = pathfinding;
    this.spatialManager = spatialManager;
  }

  /**
   * Generates input for a bot to decide its next move.
   * @param bot - The bot player
   * @returns InputData - The bot's next move
   */
  generateBotInput(bot: Player): InputData {
    this.spatialManager.updatePlayersIndex(
      Array.from(this.players.values()).filter(
        (player) => !player.isDead && !player.isProtected
      )
    );
    this.spatialManager.updatePickupsIndex(this.pickups);

    const targetPickup = this.getTargetPickup(bot);
    if (targetPickup) {
      //return this.moveToTarget(bot, targetPickup.x, targetPickup.y);
    }

    const targetPlayer = this.getTargetPlayer(bot);
    if (targetPlayer) {
      return this.combatLogic(bot, targetPlayer);
    }

    return this.randomWandering(bot);
  }

  /**
   * Finds the nearest pickup based on the bot's needs using spatial indexing.
   */
  private getTargetPickup(bot: Player): Pickup | null {
    const lowHealth = bot.health < 50;
    const lowAmmo = bot.ammo < 5;

    if (lowHealth) {
      return this.getNearestPickup(bot, (pickup) => pickup.type === healthPickup && pickup.isRedeployable);
    }

    if (lowAmmo) {
      return this.getNearestPickup(bot, (pickup) => pickup.type === ammoPickup && pickup.isRedeployable);
    }

    return null;
  }

  /**
   * Finds the nearest player using spatial indexing.
   */
  private getTargetPlayer(bot: Player): Player | null {
    const nearbyPlayers = this.spatialManager.queryNearbyObjects(
      bot.x,
      bot.y,
      300, // Search radius
      this.spatialManager.playerIndex
    );

    let nearestPlayer: Player | null = null;
    let minDistance = 9999999;

    for (const { player } of nearbyPlayers) {
      if (player.sessionId !== bot.sessionId && (!bot.team || player.team !== bot.team)) {
        const distance = Math.hypot(bot.x - player.x, bot.y - player.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPlayer = player;
        }
      }
    }

    bot.targetPlayer = nearestPlayer ? nearestPlayer.sessionId : null;
    return nearestPlayer;
  }

  /**
   * Finds the nearest pickup using spatial indexing.
   */
  private getNearestPickup(bot: Player, condition: (pickup: Pickup) => boolean): Pickup | null {
    const nearbyPickups = this.spatialManager.queryNearbyObjects(
      bot.x,
      bot.y,
      500, // Search radius
      this.spatialManager.pickupIndex
    );

    let nearestPickup: Pickup | null = null;
    let minDistance = 999999;

    for (const { pickup } of nearbyPickups) {
      if (condition(pickup)) {
        const distance = Math.hypot(bot.x - pickup.x, bot.y - pickup.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPickup = pickup;
        }
      }
    }

    return nearestPickup;
  }

  /**
   * Generates movement input for targeting a pickup or moving toward an objective.
   */
  private moveToTarget(bot: Player, targetX: number, targetY: number): InputData {
    let path = this.pathfinding.findPath(
        Math.floor(bot.x),
        Math.floor(bot.y),
        Math.floor(targetX),
        Math.floor(targetY),
        this.pickups
    );

    // If no path found, pick a nearby valid tile and try again
    if (path.length === 0) {
        console.warn(`🚨 No path found for bot at (${bot.x}, ${bot.y}). Searching alternate route.`);
        
        const nearbyTiles = [
            { x: targetX + 10, y: targetY },
            { x: targetX - 10, y: targetY },
            { x: targetX, y: targetY + 10 },
            { x: targetX, y: targetY - 10 }
        ];

        for (const altTarget of nearbyTiles) {
            path = this.pathfinding.findPath(
                Math.floor(bot.x),
                Math.floor(bot.y),
                Math.floor(altTarget.x),
                Math.floor(altTarget.y),
                this.pickups
            );

            if (path.length > 0) {
                console.log(`✅ Found alternate path to (${altTarget.x}, ${altTarget.y})`);
                break;
            }
        }
    }

    if (path.length > 0) {
        const [nextX, nextY] = path[0]; // Move towards the next step in the path
        const worldX = nextX;
        const worldY = nextY;

        const dx = worldX - bot.x;
        const dy = worldY - bot.y;

        // @ts-ignore
        return {
            up: dy < 0,
            down: dy > 0,
            left: dx < 0,
            right: dx > 0,
            pointer: {
                x: targetX,
                y: targetY,
                shoot: false,
                reload: false,
            },
            r: false,
            shoot: false,
        };
    }

    console.warn("❌ Still no valid path! Bot may be stuck.");
    return this.randomWandering(bot);
}


  /**
   * Generates combat input for targeting a player.
   */


  private combatLogic(bot: Player, target: Player): InputData {
    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const distance = Math.hypot(dx, dy);

    const shouldReload = bot.ammo <= 4;
    const canShoot = false//bot.ammo > 0 && distance < 300;

    // Ensure bot moves towards target while avoiding obstacles
    if (distance > 10) {
        return this.moveToTarget(bot, target.x, target.y);
    }

    // Check if there's a clear line of sight before shooting
    const hasLOS = this.pathfinding.hasClearLineOfSight(bot.x, bot.y, target.x, target.y);

    // @ts-ignore
    return {
      up: false,
      down: false,
      left: false,
      right: false,
      pointer: {
        x: target.x + (Math.random() - 0.5) * 20, // Slight aim variation
        y: target.y + (Math.random() - 0.5) * 20,
        shoot: canShoot && hasLOS,
        reload: shouldReload,
      },
      r: shouldReload,
      shoot: canShoot && hasLOS,
    };
}


  /**
   * Generates intelligent wandering behavior.
   */
  private randomWandering(bot: Player): InputData {
    if (!bot.randomPointerX || !bot.randomPointerY || Math.random() < 0.1) {
      // Pick a random valid tile
      const randomTile = this.pathfinding.findNearestValidTile(
        Math.floor(bot.x),
        Math.floor(bot.y)
      );

      if (randomTile) {
        bot.randomPointerX = randomTile.x;
        bot.randomPointerY = randomTile.y;
      }
    }

    return this.moveToTarget(bot, bot.randomPointerX, bot.randomPointerY);
  }
}
