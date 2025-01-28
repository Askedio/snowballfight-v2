import type { ArraySchema } from "@colyseus/schema";
import { AStarFinder, Grid } from "astar-typescript";
import type { TilemapManager } from "./TilemapManager";
import type { Collision } from "./Collision";
import type { Pickup } from "../schemas/Pickup";

export class Pathfinding {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;

  constructor(tilemapManager: TilemapManager, collisionSystem: Collision) {
    this.tilemapManager = tilemapManager;
    this.collisionSystem = collisionSystem;
  }

  /**
   * Generates a path from the bot's position to the target using A*.
   * Includes pickups marked as blocking in the collision grid.
   * @param startX Bot's current X position (tile index).
   * @param startY Bot's current Y position (tile index).
   * @param targetX Target's X position (tile index).
   * @param targetY Target's Y position (tile index).
   * @param pickups Array of pickups to consider for blocking.
   * @returns An array of [x, y] positions for the path.
   */
  findPath(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    pickups: ArraySchema<Pickup>
  ): number[][] {
    const collisionGrid = this.getUpdatedCollisionGridWithPickups(pickups);
    const grid = new Grid({ matrix: collisionGrid });
    const astar = new AStarFinder({ grid, diagonalAllowed: true });

  // Find nearest valid tile for start and target if needed
  const startTile = collisionGrid[startY]?.[startX] === 0
    ? { x: startX, y: startY }
    : this.findNearestValidTile(collisionGrid, startX, startY);

  const targetTile = collisionGrid[targetY]?.[targetX] === 0
    ? { x: targetX, y: targetY }
    : this.findNearestValidTile(collisionGrid, targetX, targetY);

  // If no valid start or target tile found, return an empty path
  if (!startTile || !targetTile) {
    console.warn("No valid start or target tile found!");
    return [];
  }

  return astar.findPath(startTile, targetTile);  }


/**
 * Finds the nearest valid (walkable) tile within a certain radius.
 * @param grid - The collision grid.
 * @param x - The starting X position.
 * @param y - The starting Y position.
 * @returns An object with `x` and `y` coordinates of the nearest valid tile, or `null` if none found.
 */
private findNearestValidTile(
    grid: number[][],
    x: number,
    y: number
  ): { x: number; y: number } | null {
    const maxRadius = 3; // How far to search for a valid tile
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          if (grid[ny] && grid[ny][nx] === 0) {
            return { x: nx, y: ny };
          }
        }
      }
    }
    return null; // No valid tile found within the search radius
  }
  


  /**
   * Checks if there is a clear line of sight between two points.
   * Useful for determining if the bot can shoot without obstruction.
   * @param fromX Starting X position.
   * @param fromY Starting Y position.
   * @param toX Target X position.
   * @param toY Target Y position.
   * @returns True if there is a clear line of sight, false otherwise.
   */
  hasClearLineOfSight(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): boolean {
    const steps = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
    const stepX = (toX - fromX) / steps;
    const stepY = (toY - fromY) / steps;

    for (let i = 0; i <= steps; i++) {
      const checkX = fromX + stepX * i;
      const checkY = fromY + stepY * i;

      if (
        this.collisionSystem.detectCollision(
          { type: "circle", x: checkX, y: checkY, radius: 1 },
          { type: "circle", x: checkX, y: checkY, radius: 1 }
        )
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Creates an updated collision grid with blocking pickups added as obstacles.
   * @param pickups Array of pickups in the game.
   * @returns A 2D array representing the updated collision grid.
   */
  private getUpdatedCollisionGridWithPickups(
    pickups: ArraySchema<Pickup>
  ): number[][] {
    const collisionGrid = this.tilemapManager.getCollisionGrid().map(
      (row) => [...row] // Create a copy of the grid to avoid mutating the original
    );

    pickups.forEach((pickup) => {
      if (pickup.blocking) {
        const tileX = Math.floor(pickup.x / this.tilemapManager.tileWidth);
        const tileY = Math.floor(pickup.y / this.tilemapManager.tileHeight);

        if (
          tileX >= 0 &&
          tileY >= 0 &&
          tileY < collisionGrid.length &&
          tileX < collisionGrid[0].length
        ) {
          collisionGrid[tileY][tileX] = 1; // Mark as blocked
        }
      }
    });

    return collisionGrid;
  }
}
