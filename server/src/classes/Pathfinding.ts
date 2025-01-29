import { AStarFinder, DijkstraFinder, JumpPointFinder, Grid } from "pathfinding";

export class Pathfinding {
  private collisionGrid: number[][];
  private finder: AStarFinder | DijkstraFinder | JumpPointFinder;
  private grid: Grid;

  constructor(collisionGrid: number[][], algorithm: "AStar" | "Dijkstra" | "JPS" = "AStar") {
    this.collisionGrid = collisionGrid;
    this.grid = new Grid(this.collisionGrid);

    // 🔀 Dynamically select pathfinding algorithm
    switch (algorithm) {
      case "Dijkstra":
        this.finder = new DijkstraFinder();
        break;
      case "JPS":
        this.finder = new JumpPointFinder();
        break;
      case "AStar":
      default:
        this.finder = new AStarFinder();
        break;
    }
  }

  /**
   * 🔍 Finds a path from start to target using the selected algorithm
   */
  findPath(startX: number, startY: number, targetX: number, targetY: number): number[][] {
    console.log(`🔍 Finding path from (${startX}, ${startY}) → (${targetX}, ${targetY})`);

    const clonedGrid = this.grid.clone(); // Clone the grid to avoid modifying original
    let path = this.finder.findPath(startX, startY, targetX, targetY, clonedGrid);

    // 🚧 Step 1: Verify the path does not contain blocked tiles
    if (this.isPathBlocked(path)) {
      console.warn(`🚨 Path contains blocked tiles! Attempting reroute...`);
      return this.reroutePath(startX, startY, targetX, targetY);
    }

    return path;
  }

  /**
   * ✅ Checks if a given path contains blocked tiles
   */
  private isPathBlocked(path: number[][]): boolean {
    return path.some(([x, y]) => this.collisionGrid[y]?.[x] === 1);
  }

  /**
   * 🔄 Attempts to reroute the path by finding nearest valid tiles
   */
  private reroutePath(startX: number, startY: number, targetX: number, targetY: number): number[][] {
    const newStart = this.findNearestValidTile(startX, startY);
    const newTarget = this.findNearestValidTile(targetX, targetY);

    if (!newStart || !newTarget) {
      console.warn(`❌ No valid alternative path found!`);
      return [];
    }

    console.log(`✅ Rerouting from (${newStart.x}, ${newStart.y}) → (${newTarget.x}, ${newTarget.y})`);
    return this.findPath(newStart.x, newStart.y, newTarget.x, newTarget.y);
  }

  /**
   * 🏃 Finds the nearest valid (walkable) tile within a search radius
   */
  findNearestValidTile(x: number, y: number): { x: number; y: number } | null {
    const maxRadius = 10; // Smaller radius to avoid excessive searching

    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          if (this.isWalkable(nx, ny)) {
            console.log(`✅ Found valid alternative tile at (${nx}, ${ny})`);
            return { x: nx, y: ny };
          }
        }
      }
    }

    console.warn(`🚨 No valid tile found near (${x}, ${y})`);
    return null;
  }

  /**
   * ✅ Checks if a tile is walkable
   */
  private isWalkable(x: number, y: number): boolean {
    return this.collisionGrid[y]?.[x] === 0;
  }

  /**
   * 🔫 Checks if there's a clear line of sight between two points
   */
  hasClearLineOfSight(fromX: number, fromY: number, toX: number, toY: number): boolean {
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    const sx = fromX < toX ? 1 : -1;
    const sy = fromY < toY ? 1 : -1;
    let err = dx - dy;
  
    let x = fromX;
    let y = fromY;

    while (x !== toX || y !== toY) {
      if (this.collisionGrid[y]?.[x] === 1) {
        return false; // Blocked
      }

      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return true;
  }
}
