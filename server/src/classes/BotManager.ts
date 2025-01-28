import type { MapSchema, ArraySchema } from "@colyseus/schema";
import type { InputData } from "../interfaces/InputData";
import type { Player } from "../schemas/Player";
import type { Pickup } from "../schemas/Pickup";

const healthPickup = "treasure";
const ammoPickup = "devil";

export class BotManager {
  private players: MapSchema<Player, string>;
  private pickups: ArraySchema<Pickup>;

  constructor(players: MapSchema<Player, string>, pickups: ArraySchema<Pickup>) {
    this.players = players;
    this.pickups = pickups;
  }

  /**
   * Generates input for a bot to decide its next move.
   * @param bot - The bot player
   * @returns InputData - The bot's next move
   */
  generateBotInput(bot: Player): InputData {
    const targetPickup = this.getTargetPickup(bot);
    if (targetPickup) {
      return this.moveToPickup(bot, targetPickup);
    }

    const targetPlayer = this.getTargetPlayer(bot);
    if (targetPlayer) {
      return this.combatLogic(bot, targetPlayer);
    }

    return this.randomWandering(bot);
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
    let nearestPlayer: Player | null = null;
    let minDistance = 999999;

    // If already targeting a player, ensure it's still valid
    if (bot.targetPlayer) {
      const currentTarget = Array.from(this.players.values()).find(
        (player) => player.sessionId === bot.targetPlayer
      );

      if (
        currentTarget &&
        !currentTarget.isDead &&
        !currentTarget.isProtected &&
        (!bot.team || currentTarget.team !== bot.team)
      ) {
        const distanceToTarget = Math.hypot(
          bot.x - currentTarget.x,
          bot.y - currentTarget.y
        );

        // Keep targeting if within 200 units
        if (distanceToTarget <= 200) {
          return currentTarget;
        }
      }
    }

    // Find the nearest valid player
    this.players.forEach((player) => {
      if (
        player.sessionId !== bot.sessionId &&
        !player.isDead &&
        !player.isProtected &&
        (!bot.team || player.team !== bot.team)
      ) {
        const distance = Math.hypot(bot.x - player.x, bot.y - player.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPlayer = player;
        }
      }
    });

    bot.targetPlayer = nearestPlayer && minDistance <= 200 ? nearestPlayer.sessionId : null;
    return nearestPlayer;
  }

  /**
   * Finds the nearest pickup based on a condition.
   */
  private getNearestPickup(bot: Player, condition: (pickup: Pickup) => boolean): Pickup | null {
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
    const dx = pickup.x - bot.x;
    const dy = pickup.y - bot.y;

    // @ts-ignore
    return {
      up: dy < 0,
      down: dy > 0,
      left: dx < 0,
      right: dx > 0,
      pointer: {
        x: pickup.x,
        y: pickup.y,
        shoot: false,
        reload: false,
      },
      r: false,
      shoot: false,
    };
  }

  /**
   * Generates combat input for targeting a player.
   */
  private combatLogic(bot: Player, target: Player): InputData {
    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const distance = Math.hypot(dx, dy);

    const shouldReload = bot.ammo <= 4;
    const canShoot = false //bot.ammo > 0 && distance < 300;

    // @ts-ignore
    return {
      up: distance > 250,
      down: distance < 250 && bot.health > 30,
      left: Math.random() > 0.5,
      right: Math.random() > 0.5,
      pointer: {
        x: target.x + (Math.random() - 0.5) * 20,
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
    const distanceToPointer = Math.hypot(
      bot.randomPointerX - bot.x,
      bot.randomPointerY - bot.y
    );

    if (!bot.randomPointerX || distanceToPointer < 50) {
      bot.randomPointerX = Math.random() * 2000; // Replace with map width
      bot.randomPointerY = Math.random() * 1100; // Replace with map height
    }

    // @ts-ignore
    return {
      up: bot.randomPointerY < bot.y,
      down: bot.randomPointerY > bot.y,
      left: bot.randomPointerX < bot.x,
      right: bot.randomPointerX > bot.x,
      pointer: {
        x: bot.randomPointerX,
        y: bot.randomPointerY,
        shoot: false,
        reload: false,
      },
      r: false,
      shoot: false,
    };
  }
}
