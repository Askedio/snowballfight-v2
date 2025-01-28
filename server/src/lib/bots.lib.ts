import type { MapSchema, ArraySchema } from "@colyseus/schema";
import type { InputData } from "../interfaces/InputData";
import type { Player } from "../schemas/Player";
import type { Pickup } from "../schemas/Pickup";

const healthPickup = "treasure";
const ammoPickup = "devil";

export function generateBotInput(
  bot: Player,
  players: MapSchema<Player, string>,
  pickups: ArraySchema<Pickup>
): InputData {
  // Helper: Find the nearest pickup based on a condition
  const getNearestPickup = (
    condition: (pickup: Pickup) => boolean
  ): Pickup | null => {
    let nearestPickup: Pickup | null = null;
    let minDistance = 999999;

    pickups.forEach((pickup) => {
      if (condition(pickup)) {
        const distance = Math.hypot(bot.x - pickup.x, bot.y - pickup.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPickup = pickup;
        }
      }
    });

    return nearestPickup;
  };

  // Target priorities
  const lowHealth = bot.health < 50;
  const lowAmmo = bot.ammo < 5;

  // Check for health or ammo pickups
  let targetPickup: Pickup | null = null;
  if (lowHealth) {
    targetPickup = getNearestPickup(
      (pickup) => pickup.type === healthPickup && pickup.isRedeployable
    );
  } else if (lowAmmo) {
    targetPickup = getNearestPickup(
      (pickup) => pickup.type === ammoPickup && pickup.isRedeployable
    );
  }

  if (targetPickup) {
    // Move toward the pickup
    const dx = targetPickup.x - bot.x;
    const dy = targetPickup.y - bot.y;
    const distance = Math.hypot(dx, dy);

    // @ts-ignore
    return {
      up: dy < 0 && distance > 10,
      down: dy > 0 && distance > 10,
      left: dx < 0 && distance > 10,
      right: dx > 0 && distance > 10,
      pointer: {
        x: targetPickup.x,
        y: targetPickup.y,
        shoot: false,
        reload: false,
      },
      r: false,
      shoot: false,
    };
  }

  // Combat logic if no pickups are a priority
  const target = getNearestPlayer(bot, players);

  if (target) {
    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const distance = Math.hypot(dx, dy);

    const shouldReload = Math.random() < 0.2 && bot.ammo <= 4;
    const canShoot = Math.random() < 0.2 && bot.ammo > 4;

    // @ts-ignore
    return {
      up: distance > 250, // Move closer if far
      down: distance < 250 && bot.health > 30, // Back off if too close and health is okay
      left: distance > 0 ? Math.random() > 0.5 : false, // Random strafing
      right: distance > 0 ? Math.random() > 0.5 : false,
      pointer: {
        x: target.x + (Math.random() - 0.5) * 20, // Random offset for human-like aim
        y: target.y + (Math.random() - 0.5) * 20,
        shoot: canShoot && distance < 300 && !shouldReload,
        reload: shouldReload,
      },
      r: shouldReload,
      shoot: canShoot && distance < 300,
    };
  }

  // Random wandering if no target or pickups
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

export function getNearestPlayer(
  bot: Player,
  players: MapSchema<Player, string>
): Player | null {
  let nearestPlayer: Player | null = null;
  let minDistance = 999999;

  if (bot.targetPlayer) {
    const targetPlayer = Array.from(players.values()).find(
      (_) => _.sessionId === bot.targetPlayer
    );
    if (targetPlayer && !targetPlayer.isDead && !targetPlayer.isProtected) {
      return targetPlayer;
    }
  }

  players.forEach((player) => {
    if (
      player.sessionId !== bot.sessionId && // Not the bot itself
      !player.isDead && // Player is not dead
      !player.isProtected && // Player is not protected
      (!bot.team || player.team !== bot.team) // Either no team for the bot or the player's team is different
    ) {
      const distance = Math.hypot(bot.x - player.x, bot.y - player.y);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPlayer = player;
      }
    }
  });

  bot.targetPlayer = nearestPlayer?.sessionId || null;
  return nearestPlayer;
}
