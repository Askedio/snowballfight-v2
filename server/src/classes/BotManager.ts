import type { MapSchema, ArraySchema } from "@colyseus/schema";
import type { InputData } from "../interfaces/InputData";
import { PathNode, type Player } from "../schemas/Player";
import type { Pickup } from "../schemas/Pickup";
import { SpatialPartitioningManager } from "./SpatialPartitioningManager";
import type { BaseRoom } from "../rooms/BaseRoom";

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
  private room: any;
  spatialManager: SpatialPartitioningManager;

  constructor(
    players: MapSchema<Player, string>,
    pickups: ArraySchema<Pickup>,
    spatialManager: SpatialPartitioningManager,
    room: any
  ) {
    this.players = players;
    this.pickups = pickups;
    this.spatialManager = spatialManager;
    this.room = room;
  }

  /**
   * Generates input for a bot to decide its next move.
   */
  generateBotInput(bot: Player): InputData {
    if (bot.health < 40) {
      this.state = BotState.Fleeing;
    } else if (this.getTargetPlayer(bot)) {
      this.state = BotState.Combat;
    } else if (this.getTargetPickup(bot)) {
      this.state = BotState.Chasing;
    } else {
      this.state = BotState.Wandering;
    }

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
        (pickup) => pickup.type === healthPickup
      );
    }

    if (lowAmmo) {
      return this.getNearestPickup(bot, (pickup) => pickup.type === ammoPickup);
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
        const healthScore = 100 - player.health;
        const distanceScore = 200 - distance;
        const totalScore = healthScore + distanceScore;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestTarget = player;
        }
      }
    });

    bot.targetPlayer = bestTarget ? bestTarget.sessionId : null;
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
    let minDistance = Infinity;

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
    const distance = Math.hypot(bot.x - target.x, bot.y - target.y);

    if (distance < 100) {
      // 🚨 If too close, move away
      return this.moveAwayFromTarget(bot, target.x, target.y);
    } else {
      // 🚀 Otherwise, chase the player
      return this.steer(bot, target.x, target.y, distance < 150);
    }
  }

  private moveAwayFromTarget(
    bot: Player,
    targetX: number,
    targetY: number
  ): InputData {
    const dx = bot.x - targetX;
    const dy = bot.y - targetY;
    const distance = Math.hypot(dx, dy);

    if (distance === 0)
      // @ts-ignore
      return { up: false, down: false, left: false, right: false };

    // 🚀 Move to a position opposite of the target
    const escapeX = bot.x + (dx / distance) * 200; // Move 200px away
    const escapeY = bot.y + (dy / distance) * 200;

    return this.steer(bot, escapeX, escapeY);
  }

  /**
   * Generates wandering behavior when no targets are available.
   */
  private randomWandering(bot: Player): InputData {
    if (
      !bot.randomPointerX ||
      Math.hypot(bot.randomPointerX - bot.x, bot.randomPointerY - bot.y) < 50
    ) {
      bot.randomPointerX = Math.random() * 2000;
      bot.randomPointerY = Math.random() * 1000;
    }
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
    return this.steer(bot, nearestPickup.x, nearestPickup.y);
  }

  /**
   * Steering logic for smooth movement and pathfinding.
   */
  private steer(
    bot: Player,
    targetX: number,
    targetY: number,
    isShooting: boolean = false
  ): InputData {
    const currentX = bot.x;
    const currentY = bot.y;

    bot.isMoving = false;

    // **Recalculate path if needed**
    if (
      Math.hypot(bot.lastTargetX - targetX, bot.lastTargetY - targetY) > 100 ||
      bot.path.length === 0
    ) {
      bot.lastTargetX = targetX;
      bot.lastTargetY = targetY;

      try {
        const computedPath = this.room.pathfinding.findPath(
          currentX,
          currentY,
          targetX,
          targetY
        );

        bot.path.clear();

        if (computedPath.length > 0) {
          computedPath.forEach(({ x, y }: any) =>
            bot.path.push(new PathNode(x, y))
          );
        }
      } catch (e) {
        console.error("Pathfinding error:", e);
      }
    }

    if (bot.path.length > 0) {
      const nextStep = bot.path[0];

      if (
        !nextStep ||
        typeof nextStep.x !== "number" ||
        typeof nextStep.y !== "number"
      ) {
        bot.path.shift();
        return this.stopMoving(bot);
      }

      const dx = nextStep.x - bot.x;
      const dy = nextStep.y - bot.y;
      const distance = Math.hypot(dx, dy);

      if (isNaN(distance) || distance < bot.playerRadius * 0.5) {
        bot.path.shift();
        return this.stopMoving(bot);
      }

      // ✅ Only mark as moving if there's significant movement
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        bot.isMoving = true;
      }

      // ✅ Move bot
      const speed = bot.speed || 2;
      const moveX = (dx / distance) * speed;
      const moveY = (dy / distance) * speed;
      bot.x += moveX;
      bot.y += moveY;

      // ✅ Determine rotation
      let targetRotation = bot.rotation; // Default to current rotation

      if (isShooting) {
        // **If shooting, face targetX, targetY**
        const shootDx = targetX - bot.x;
        const shootDy = targetY - bot.y;
        targetRotation = Math.atan2(shootDy, shootDx);
      } else {
        // **If moving, face movement direction**
        targetRotation = Math.atan2(dy, dx);
      }

      bot.rotation = bot.smoothAngle(bot.rotation, targetRotation, 0.1);

      // @ts-ignore
      return {
        up: dy < 0,
        down: dy > 0,
        left: dx < 0,
        right: dx > 0,
        pointer: { x: targetX, y: targetY, shoot: isShooting, reload: false },
        r: false,
        shoot: isShooting,
      };
    }

    return this.stopMoving(bot);
  }

  /**
   * ✅ Stops the bot and ensures `isMoving` is false.
   */
  private stopMoving(bot: Player): InputData {
    bot.isMoving = false;

    // @ts-ignore
    return {
      up: false,
      down: false,
      left: false,
      right: false,
      pointer: {
        x: bot.lastTargetX,
        y: bot.lastTargetY,
        shoot: false,
        reload: false,
      },
      r: false,
      shoot: false,
    };
  }

  /**
   * ✅ Smoothly interpolate between two angles.
   */
  private lerpAngle(from: number, to: number, amount: number): number {
    let difference = to - from;
    while (difference > Math.PI) difference -= Math.PI * 2;
    while (difference < -Math.PI) difference += Math.PI * 2;
    return from + difference * amount;
  }
}
