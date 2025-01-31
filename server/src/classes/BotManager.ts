import type { InputData } from "../interfaces/InputData";
import { type Player } from "../schemas/Player";
import type { Pickup } from "../schemas/Pickup";
import { SpatialPartitioningManager } from "./SpatialPartitioningManager";
import { BaseRoom } from "../rooms/BaseRoom";
import { BaseRoomState } from "../states/BaseRoomState";
import { BotState } from "./BotStateManager";

const healthPickup = "treasure";
const ammoPickup = "devil";

export class BotManager {
  private room: BaseRoom<BaseRoomState>;
  spatialManager: SpatialPartitioningManager;

  constructor(
    spatialManager: SpatialPartitioningManager,
    room: BaseRoom<BaseRoomState>
  ) {
    this.spatialManager = spatialManager;
    this.room = room;
  }

  /**
   * Generates input for a bot to decide its next move.
   */
  generateBotInput(bot: Player): InputData {
    let state = this.room.botPathManager.getState(bot.sessionId);

    if (bot.health < 40) {
      state = BotState.Fleeing;
    } else if (this.getTargetPlayer(bot)) {
      state = BotState.Combat;
    } else if (this.getTargetPickup(bot)) {
      state = BotState.Chasing;
    } else {
      state = BotState.Wandering;
    }

    this.room.botPathManager.setState(bot.sessionId, state);


    switch (state) {
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

    const nearbyPlayers = this.spatialManager.queryNearbyObjects(
      bot.x,
      bot.y,
      4000, // Query radius
      this.spatialManager.playerIndex
    );

    nearbyPlayers.forEach(({ player }) => {
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

    this.room.botPathManager.setTargetPlayer(
      bot.sessionId,
      bestTarget ? bestTarget.sessionId : null
    );

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

    const nearbyPickups = this.spatialManager.queryNearbyObjects(
      bot.x,
      bot.y,
      5000, // Query radius (adjust based on pickup interaction range)
      this.spatialManager.pickupIndex
    );

    nearbyPickups.forEach(({ pickup }) => {
      if (condition(pickup)) {
        nearestPickup = pickup;
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

    if (distance <= bot.playerRadius) {
      this.room.botPathManager.setState(bot.sessionId, BotState.Fleeing);

      return this.flee(bot);
    }

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
    const sessionId = bot.sessionId;

    let isMoving = false;

    // ✅ Get bot's path from BotPathManager
    let botPath = this.room.botPathManager.getPath(sessionId);

    const lastTargetX = this.room.botPathManager.getLastTargetX(sessionId)
    const lastTargetY = this.room.botPathManager.getLastTargetY(sessionId)

    // **Recalculate path if needed**
    if (
      Math.hypot(lastTargetX - targetX, lastTargetY - targetY) > 100 ||
      botPath.length === 0
    ) {
      this.room.botPathManager.setLastTarget(bot.sessionId, targetX, targetY);

      try {
        const computedPath = this.room.tilemapManager.findPath(
          currentX,
          currentY,
          targetX,
          targetY
        );

        this.room.botPathManager.setPath(sessionId, computedPath);
        botPath = computedPath; // Update botPath reference
      } catch (e) {
        console.error("Pathfinding error:", e);
      }
    }


    if (botPath.length > 0) {
      const nextStep = botPath[0];

      if (
        !nextStep ||
        typeof nextStep.x !== "number" ||
        typeof nextStep.y !== "number"
      ) {
        this.room.botPathManager.shiftPath(sessionId); // Remove invalid step
        return this.stopMoving(bot);
      }

      const dx = nextStep.x - bot.x;
      const dy = nextStep.y - bot.y;
      const distance = Math.hypot(dx, dy);


      if (isNaN(distance) || distance < bot.playerRadius * 0.5) {
        this.room.botPathManager.shiftPath(sessionId);
        return this.stopMoving(bot);
      }

      // ✅ Only mark as moving if there's significant movement
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        isMoving = true;
      }

      // ✅ Move bot
      const speed = bot.speed || 2;
      const moveX = (dx / distance) * speed;
      const moveY = (dy / distance) * speed;

      bot.x += moveX;
      bot.y += moveY;
      bot.isMoving = isMoving

      // ✅ Determine rotation
      let targetRotation = bot.rotation;

      if (isShooting) {
        // **If shooting, face targetX, targetY**
        targetRotation = Math.atan2(targetY - bot.y, targetX - bot.x);
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
        pointer: { x: targetX, y: targetY },
        r: false,
        shoot: false, // Temporary shooting flag
      };
    }

    return this.stopMoving(bot);
  }

  /**
   * ✅ Stops the bot and ensures `isMoving` is false.
   */
  private stopMoving(bot: Player): InputData {
    const lastTargetX = this.room.botPathManager.getLastTargetX(bot.sessionId)
    const lastTargetY = this.room.botPathManager.getLastTargetY(bot.sessionId)

    bot.isMoving = false;

    // @ts-ignore
    return {
      up: false,
      down: false,
      left: false,
      right: false,
      pointer: {
        x: lastTargetX,
        y: lastTargetY,
      },
      r: false,
      shoot: false,
    };
  }
}
