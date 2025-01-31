import { NavMesh } from "navmesh";
import type { PolyPoints } from "navmesh";

export class Pathfinding {
  private navMesh: NavMesh;
  private readonly TILE_SIZE = 32; // Adjust based on actual tile size

  constructor(polygonMap: PolyPoints[]) {
    // Initialize the NavMesh with polygon data from TilemapManager
    this.navMesh = new NavMesh(polygonMap, this.TILE_SIZE * 2); // Adjust link distance if needed
  }

  /**
   * 🔍 Finds a path from start to target using the NavMesh.
   */
  findPath(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number
  ): { x: number; y: number }[] {
    const start = { x: startX, y: startY };
    const end = { x: targetX, y: targetY };

    // Find the path using NavMesh
    const path = this.navMesh.findPath(start, end);

   
    if (!path || path.length === 0) {
      //console.warn(
      //  `🚨 No valid path found from (${startX}, ${startY}) to (${targetX}, ${targetY})`
      //);
      return [];
    }

    return path;
  }

  isWalkable(x: number, y: number) {
    return this.navMesh.isPointInMesh({x, y});
  }
}
