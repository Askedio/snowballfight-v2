import type { MapSchema } from "@colyseus/schema";
import type { InputData } from "../interfaces/InputData";
import type { Player } from "../schemas/Player";

export function generateBotInput(bot: Player, target: Player): InputData {
  if (!target?.x) {
    let randomMove: any = {
      up: false,
      down: false,
      left: false,
      right: false,
    };

    const distanceToPointer = Math.hypot(
      bot.randomPointerX - bot.x,
      bot.randomPointerY - bot.y
    );

    if (!bot.randomPointerX || distanceToPointer < 1000) {
      // Adjust threshold as needed
      const worldWidth = 2000; // Replace with your game's world width
      const worldHeight = 1100; // Replace with your game's world height

      bot.randomPointerX = Math.random() * worldWidth;
      bot.randomPointerY = Math.random() * worldHeight;
    }

    // Randomize movement directions
    randomMove = {
      up: distanceToPointer > 0,
      down: false,
      left: false,
      right: false,
      pointer: {
        x: bot.randomPointerX,
        y: bot.randomPointerY,
      },
    };

    return {
      shoot: false, // No shooting without a target
      pointer: {
        x: bot?.x,
        y: bot?.y,
        shoot: false,
        reload: false,
      },
      r: false, // No reloading without a target
      ...randomMove,
    };
  }

  const dx = target?.x - bot.x;
  const dy = target?.y - bot.y;
  const distance = Math.hypot(dx, dy);

  // Random chance to reload instead of shooting
  const shouldReload = Math.random() < 0.2 && bot.ammo <= 4; // 20% chance to reload if ammo isn't full

  const canShoot = Math.random() < 0.2 && bot.ammo > 4;

  // @ts-ignore
  return {
    up: distance > 250, // Move closer if far
    down: distance < 250, // Back off if too close
    left: distance > 0 ? Math.random() > 0.5 : false, // Random strafing
    right: distance > 0 ? Math.random() > 0.5 : false,
    pointer: {
      x: target?.x + (Math.random() - 0.5) * 20, // Random offset between -10 and +10
      y: target?.y + (Math.random() - 0.5) * 20, // Random offset between -10 and +10
      shoot: canShoot && distance < 300 && !shouldReload, // Aim at the target if shooting
      reload: shouldReload, // Reload if shouldReload is true
    },
    r: shouldReload, // Reload if the bot is reloading
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
      player.sessionId !== bot.sessionId &&
      !player.isDead &&
      !player.isProtected
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
