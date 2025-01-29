import type { MapSchema, ArraySchema } from "@colyseus/schema";
import type { InputData } from "../interfaces/InputData";
import type { Player } from "../schemas/Player";
import type { Pickup } from "../schemas/Pickup";
import { SpatialPartitioningManager } from "./SpatialPartitioningManager";

const healthPickup = "treasure";
const ammoPickup = "devil";

enum BotState {
  Wandering,
  Chasing,
  Combat,
  Fleeing,
}

export class BotManager {
  private players: MapSchema<Player, string>;
  private pickups: ArraySchema<Pickup>;
  private state: BotState = BotState.Wandering;
  spatialManager: SpatialPartitioningManager;

  constructor(
    players: MapSchema<Player, string>,
    pickups: ArraySchema<Pickup>,
    spatialManager: SpatialPartitioningManager
  ) {
    this.players = players;
    this.pickups = pickups;
    this.spatialManager = spatialManager;
  }

  /**
   * Generates input for a bot to decide its next move.
   * @param bot - The bot player
   * @returns InputData - The bot's next move
   */
  generateBotInput(bot: Player): InputData {
    // Update bot state based on conditions
    if (bot.health < 40) {
      this.state = BotState.Fleeing;
    } else if (this.getTargetPlayer(bot)) {
      this.state = BotState.Combat;
    } else if (this.getTargetPickup(bot)) {
      this.state = BotState.Chasing;
    } else {
      this.state = BotState.Wandering;
    }
    

    // Generate input based on the current state
    switch (this.state) {
      case BotState.Wandering:
        return this.randomWandering(bot);
      case BotState.Chasing:
        return this.moveToPickup(bot, this.getTargetPickup(bot)!);
      case BotState.Combat:
        return this.combatLogic(bot, this.getTargetPlayer(bot)!);
      case BotState.Fleeing:
        return this.flee(bot);
    }
  }

  /**
   * Finds the nearest pickup based on the bot's needs.
   */
  private getTargetPickup(bot: Player): Pickup | null {
    const lowHealth = bot.health < 50;
    const lowAmmo = bot.ammo < 5;

    if (lowHealth) {
      return this.getNearestPickup(
        bot,
        (pickup) => pickup.type === healthPickup && pickup.isRedeployable
      );
    }

    if (lowAmmo) {
      return this.getNearestPickup(
        bot,
        (pickup) => pickup.type === ammoPickup && pickup.isRedeployable
      );
    }

    return null;
  }

  /**
   * Finds the nearest player to the bot based on targeting logic.
   */
  private getTargetPlayer(bot: Player): Player | null {
    let bestTarget: Player | null = null;
    let bestScore = -Infinity;

    this.players.forEach((player) => {
      if (
        player.sessionId !== bot.sessionId &&
        !player.isDead &&
        !player.isProtected &&
        (!bot.team || player.team !== bot.team)
      ) {
        const distance = Math.hypot(bot.x - player.x, bot.y - player.y);
        const healthScore = 100 - player.health; // Prioritize low-health players
        const distanceScore = 200 - distance; // Prioritize closer players

        const totalScore = healthScore + distanceScore;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestTarget = player;
        }
      }
    });

    bot.targetPlayer =
      bestTarget && bestScore > 0 ? bestTarget.sessionId : null;
    return bestTarget;
  }

  /**
   * Finds the nearest pickup based on a condition.
   */
  private getNearestPickup(
    bot: Player,
    condition: (pickup: Pickup) => boolean
  ): Pickup | null {
    let nearestPickup: Pickup | null = null;
    let minDistance = 999999;

    this.pickups.forEach((pickup) => {
      if (condition(pickup)) {
        const distance = Math.hypot(bot.x - pickup.x, bot.y - pickup.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPickup = pickup;
        }
      }
    });

    return nearestPickup;
  }

  /**
   * Generates movement input for targeting a pickup.
   */
  private moveToPickup(bot: Player, pickup: Pickup): InputData {
    return this.steer(bot, pickup.x, pickup.y);
  }

  /**
   * Generates combat input for targeting a player.
   */
  private combatLogic(bot: Player, target: Player): InputData {
    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const distance = Math.hypot(dx, dy);

    const shouldReload = bot.ammo <= 4 && distance > 200; // Reload only when safe
    const canShoot = bot.ammo > 0 && distance < 300;

    // Kiting: Move away if too close, move closer if too far
    const isTooClose = distance < 150;
    const isTooFar = distance > 250;
    // @ts-ignore
    return {
      up: isTooFar,
      down: isTooClose,
      left: Math.random() > 0.5,
      right: Math.random() > 0.5,
      pointer: {
        x: target.x + (Math.random() - 0.5) * 20, // Add some randomness to aim
        y: target.y + (Math.random() - 0.5) * 20,
        shoot: canShoot,
        reload: shouldReload,
      },
      r: shouldReload,
      shoot: canShoot,
    };
  }

  /**
   * Generates wandering behavior when no targets are available.
   */
  private randomWandering(bot: Player): InputData {
    // Define inner bounds (playable area)
    const innerBounds = {
      minX: (2240 - 200) / 2, // Centered horizontally: (2240 - 800) / 2 = 720
      maxX: (2240 + 200) / 2, // Centered horizontally: (2240 + 800) / 2 = 1520
      minY: (1344 - 200) / 2, // Centered vertically: (1344 - 600) / 2 = 372
      maxY: (1344 + 200) / 2, // Centered vertically: (1344 + 600) / 2 = 972
    };
  
    // If the bot has no random target or is close to it, generate a new one within the inner bounds
    if (
      !bot.randomPointerX ||
      Math.hypot(bot.randomPointerX - bot.x, bot.randomPointerY - bot.y) < 50
    ) {
      bot.randomPointerX = innerBounds.minX + Math.random() * (innerBounds.maxX - innerBounds.minX);
      bot.randomPointerY = innerBounds.minY + Math.random() * (innerBounds.maxY - innerBounds.minY);
    }
  
    // Steer toward the random target
    return this.steer(bot, bot.randomPointerX, bot.randomPointerY);
  }

  /**
   * Generates fleeing behavior when the bot is low on health.
   */
  private flee(bot: Player): InputData {
    const nearestPickup = this.getTargetPickup(bot);
    if (!nearestPickup) {
      return this.randomWandering(bot);
    }

    return this.steer(bot, nearestPickup.x, nearestPickup.y)
  }

  /**
   * Steering logic for smooth movement and obstacle avoidance.
   */
  private steer(bot: Player, targetX: number, targetY: number): InputData {
    const dx = targetX - bot.x;
    const dy = targetY - bot.y;
    const distance = Math.hypot(dx, dy);

    // Normalize direction
    const dirX = dx / distance || 0;
    const dirY = dy / distance || 0;

    // Avoid obstacles (e.g., walls or other players)
    const avoidForce = this.avoidObstacles(bot, dirX, dirY);
    const steerX = dirX + avoidForce.x;
    const steerY = dirY + avoidForce.y;

    // Generate input based on steering direction
    // @ts-ignore
    return {
      up: steerY < 0,
      down: steerY > 0,
      left: steerX < 0,
      right: steerX > 0,
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

  /**
   * Avoid obstacles by adjusting the bot's movement direction.
   */
  private avoidObstacles(
    bot: Player,
    dirX: number,
    dirY: number
  ): { x: number; y: number } {
    const avoidForce = { x: 0, y: 0 };

    // Query nearby pickups
    const nearbyPickups = this.spatialManager.queryNearbyObjects(
      bot.x,
      bot.y,
      100, // Query radius (adjust as needed)
      this.spatialManager.pickupIndex
    );

    nearbyPickups.forEach(({ pickup }) => {
      // Only avoid pickups that are blocking
      if (pickup.blocking) {
        const dx = bot.x - pickup.x;
        const dy = bot.y - pickup.y;
        const distance = Math.hypot(dx, dy);

        // Define a "wide berth" radius (e.g., 2x the pickup's collision radius)
        const wideBerthRadius = (pickup.radius || 20) * 4;

        if (distance < wideBerthRadius) {
          // Push away from the blocking pickup
          const overlap = wideBerthRadius - distance;
          const nx = dx / distance || 0;
          const ny = dy / distance || 0;

          // Adjust the strength of the avoidance force
          avoidForce.x += nx * overlap * 0.5; // Increase multiplier for stronger avoidance
          avoidForce.y += ny * overlap * 0.5;
        }
      }
    });

    return avoidForce;
  }
}
