import { AStarFinder, DiagonalMovement, DijkstraFinder, Grid } from "pathfinding";

export class Pathfinding {
  private collisionGrid: number[][];
  private finder: AStarFinder | DijkstraFinder;
  private grid: Grid;
  private readonly TILE_SIZE = 32; // Adjust based on actual tile size

  constructor(
    collisionGrid: number[][],
    algorithm: "AStar" | "Dijkstra" = "AStar"
  ) {
    this.collisionGrid = collisionGrid;
    this.grid = new Grid(this.collisionGrid);

    // 🔀 Choose algorithm
    switch (algorithm) {
      case "Dijkstra":
        this.finder = new DijkstraFinder();
        break;
      case "AStar":
      default:
        this.finder = new AStarFinder({      allowDiagonal: true, // ✅ Enable diagonal movement
          diagonalMovement: DiagonalMovement.IfAtMostOneObstacle, // Prevents passing through corners
    });
        break;
    }
  }

  /**
   * 🔍 Finds a path from start to target, ensuring the bot/player fits
   */
  findPath(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    playerRadius: number, // ✅ Consider player size
    retries: number = 0,
    maxRetries: number = 15
  ): number[][] {
    const clonedGrid = this.grid.clone();
  
    // ✅ Validate start and target positions
    const startTile = this.findNearestValidTile(startX, startY, playerRadius);
    const targetTile = this.findNearestValidTile(targetX, targetY, playerRadius);
  
    if (!startTile || !targetTile) {
      console.warn(`🚨 No valid start or target tile found!`);
      return [];
    }
  
    let path = this.finder.findPath(
      startTile.x,
      startTile.y,
      targetTile.x,
      targetTile.y,
      clonedGrid
    );
  
  
    return path.filter(([x, y]) => this.isWalkable(x, y, playerRadius));

  }
  

  /**
   * 🔄 Attempts to reroute the path by finding nearest valid tiles
   */
  private reroutePath(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    playerRadius: number
  ): number[][] {
    const newStart = this.findNearestValidTile(startX, startY, playerRadius);
    const newTarget = this.findNearestValidTile(targetX, targetY, playerRadius);

    if (!newStart || !newTarget) {
      console.warn(`❌ No valid alternative path found!`);
      return [];
    }

    console.log(
      `✅ Rerouting from (${newStart.x}, ${newStart.y}) → (${newTarget.x}, ${newTarget.y})`
    );
    return this.findPath(
      newStart.x,
      newStart.y,
      newTarget.x,
      newTarget.y,
      playerRadius
    );
  }

  /**
   * ✅ Checks if a given path contains blocked tiles
   */
  private isPathBlocked(path: number[][], playerRadius: number): boolean {
    return path.some(([x, y]) => !this.isWalkable(x, y, playerRadius));
  }

  /**
   * ✅ Checks if a tile is walkable, ensuring the player fits
   */
  private isWalkable(x: number, y: number, radius: number): boolean {
    const checkRadius = Math.ceil(radius / this.TILE_SIZE); // Convert radius to tiles

    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      for (let dy = -checkRadius; dy <= checkRadius; dy++) {
        if (this.collisionGrid[y + dy]?.[x + dx] === 1) {
          return false; // 🚫 Blocked
        }
      }
    }
    return true;
  }

  /**
   * 🔄 Finds the nearest valid (walkable) tile within a search radius
   */
  findNearestValidTile(
    x: number,
    y: number,
    radius: number
  ): { x: number; y: number } | null {
    const maxRadius = 10; // Search radius

    for (let searchRadius = 1; searchRadius <= maxRadius; searchRadius++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          if (this.isWalkable(nx, ny, radius)) {
            return { x: nx, y: ny };
          }
        }
      }
    }

    console.warn(`🚨 No valid tile found near (${x}, ${y})`);
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
