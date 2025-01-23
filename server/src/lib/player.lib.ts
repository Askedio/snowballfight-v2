import type { Player } from "../schemas/Player";
import type { TilemapManager } from "../TilemapManager";

export async function resetPlayer(player: Player, tilemapManager: TilemapManager) {
  await assignRandomPosition(player, tilemapManager); // Respawn at a new position

  player.health = player.defaultHealth; // Restore health
  player.ammo = player.defaultAmmo; // Restore ammo
  player.isDead = false; // Mark as alive

  // Respawn protection.
  player.isProtected = true;
  setTimeout(() => {
    player.isProtected = false;
  }, player.protectionTime);
}

export  async function assignRandomPosition(
  player: Player,
  tilemapManager: TilemapManager
) {
  try {
    const spawn = await tilemapManager.getRandomSpawn();

    player.x = spawn.x;
    player.y = spawn.y;
  } catch (error) {
    console.error("Error assigning spawn position:", error);
    // Fallback to a default position
    player.x = 400;
    player.y = 300;
  }
}
