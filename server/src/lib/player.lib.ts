import type { Player } from "../schemas/Player";
import type { TilemapManager } from "../TilemapManager";

export async function respawnPlayer(
  player: Player,
  tilemapManager: TilemapManager,
) {
  await assignSpawn(player, tilemapManager); // Respawn at a new position

  player.respawn();

  // Respawn protection.
  player.isProtected = true;

  setTimeout(() => {
    player.isProtected = false;
  }, player.protectionTime);
}

export async function assignSpawn(
  player: Player,
  tilemapManager: TilemapManager,
) {
  try {
    const spawn = await tilemapManager.getRandomSpawn(player.team);

    player.x = spawn.x;
    player.y = spawn.y;
  } catch (error) {
    console.error("Error assigning spawn position:", error);
    // Fallback to a default position
    player.x = 400;
    player.y = 300;
  }
}

// Normalize the rotation to be within [-PI, PI]
export function wrapAngle(angle: number): number {
  return ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
}

// Smooth the angle to the target while handling full rotations correctly
export function smoothAngle(
  current: number,
  target: number,
  factor: number
): number {
  // Calculate the delta between the current and target angle
  let delta = target - current;

  // Normalize delta to the range [-PI, PI] (this is crucial)
  delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;

  // If delta is positive, rotate clockwise, otherwise rotate counter-clockwise
  if (Math.abs(delta) > Math.PI) {
    if (delta > 0) {
      delta -= 2 * Math.PI; // Make sure we rotate the shorter distance (counter-clockwise)
    } else {
      delta += 2 * Math.PI; // Rotate clockwise if we're going the long way
    }
  }

  // Apply the smoothing factor
  const smoothedDelta = delta * factor;

  // Add the smoothed delta to the current rotation
  const newRotation = current + smoothedDelta;

  // Wrap the result to ensure it's within the range [-PI, PI]
  return wrapAngle(newRotation);
}
