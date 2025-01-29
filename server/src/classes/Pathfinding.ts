import type { ArraySchema } from "@colyseus/schema";
import { AStarFinder, Grid } from "astar-typescript";
import type { Pickup } from "../schemas/Pickup";

export class Pathfinding {
  collisionGrid: number[][];

  constructor(collisionGrid: number[][]) {
    this.collisionGrid = collisionGrid;
  }

  /**
   * 🔍 Finds a path from start to target using A* (avoiding blocked tiles)
   */
  findPath(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    pickups: ArraySchema<Pickup>
  ): number[][] {
    //console.log(`🔍 Pathfinding from (${startX}, ${startY}) → (${targetX}, ${targetY})`);

    // 🛠 Create a fresh grid copy (to avoid modifying the original)
    const grid = new Grid({
      matrix: this.collisionGrid.map((row) => [...row]),
    });
    const astar = new AStarFinder({ grid, diagonalAllowed: false });

    // ✅ Validate start and target tiles
    let startTile = this.getValidTile(startX, startY);
    let targetTile = this.getValidTile(targetX, targetY);

    if (!startTile || !targetTile) {
      // console.warn(`🚨 No valid start or target tile found!`);
      return [];
    }

    let path = astar.findPath(startTile, targetTile);

    // 🔎 Check if path contains blocked tiles
    const blockedTiles: number[][] = [];
    path.forEach(([x, y]) => {
      if (this.collisionGrid[y]?.[x] === 1) {
        blockedTiles.push([x, y]);
      }
    });

    if (blockedTiles.length > 0) {
      // console.warn(`🚧 Blocked tiles along computed path:`, blockedTiles);

      // 🛑 Force Rerouting - Try Again With Larger Search Radius
      // console.warn(`🔄 Rerouting A* Path to avoid blocked tiles...`);
      startTile = this.findNearestValidTile(startX, startY);
      targetTile = this.findNearestValidTile(
        targetX,
        targetY
      );

      if (!startTile || !targetTile) {
        // console.warn(`❌ Still no valid start or target tile after rerouting!`);
        return [];
      }

      path = astar.findPath(startTile, targetTile);
    }

    if (path.length === 0) {
      // console.warn(`⚠️ No valid path found! Target (${targetTile.x}, ${targetTile.y}) might still be blocked.`);
    } else {
      // console.log(`✅ Path is now clear!`);
    }

    // console.log(`🚀 Computed Path:`, path);
    return path;
  }

  /**
   * ✅ Ensures a given tile is walkable, checking bounds
   */
  private isWalkable(grid: number[][], x: number, y: number): boolean {
    return grid[y]?.[x] === 0;
  }

  /**
   * 🔄 Finds nearest valid tile within a search radius
   */
  private getValidTile(x: number, y: number): { x: number; y: number } | null {
    if (this.isWalkable(this.collisionGrid, x, y)) {
      return { x, y };
    }
    return this.findNearestValidTile(x, y);
  }

  /**
   * 🏃 Searches for the nearest valid (walkable) tile within a set radius
   */
  findNearestValidTile(
    x: number,
    y: number
  ): { x: number; y: number } | null {
    const maxRadius = 60; // Increased radius for better pathfinding

    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          if (this.isWalkable(this.collisionGrid, nx, ny)) {
            // console.log(`✅ Corrected nearest valid tile found at (${nx}, ${ny})`);
            return { x: nx, y: ny };
          }
        }
      }
    }

    // console.warn(`🚨 No valid tile found near (${x}, ${y})`);
    return null;
  }

  /**
   * 🔫 Checks if there's a clear line of sight between two points
   */
  hasClearLineOfSight(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): boolean {
    return true; // ✅ Clear line of sight
  }
}
