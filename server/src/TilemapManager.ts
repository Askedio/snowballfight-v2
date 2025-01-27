import * as fs from "node:fs";
import type * as tiled from "@kayahr/tiled";
import RBush from "rbush";

export interface TileBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollisionTile {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class TilemapManager {
  private collisionIndex: RBush<CollisionTile>;
  private spawnTiles: TileBounds[] = [];
  private tileWidth: number;
  private tileHeight: number;
  private mapJson: any;
  private players: any;
  private collisionLayerName: string;

  constructor(
    mapFilePath: string,
    collisionLayerName: string,
    spawnLayerName: string,
    players: any
  ) {
    this.players = players;
    this.collisionIndex = new RBush<CollisionTile>();
    this.collisionLayerName = collisionLayerName;

    // Load and parse the map JSON
    const mapJson = JSON.parse(
      fs.readFileSync(mapFilePath, "utf8")
    ) as tiled.Map;

    this.mapJson = mapJson;

    // Extract collision layer
    const collisionLayer = mapJson.layers.find(
      (layer) => layer.name === collisionLayerName
    );
    if (!collisionLayer || collisionLayer.type !== "tilelayer") {
      throw new Error(
        `Collision layer "${collisionLayerName}" not found or is not a tile layer!`
      );
    }

    this.tileWidth = mapJson.tilewidth;
    this.tileHeight = mapJson.tileheight;

    // Parse collision tiles
    const collisionTiles: CollisionTile[] = [];
    (collisionLayer.data as number[]).forEach((tileIndex, index) => {
      if (tileIndex !== 0) {
        // Non-zero tile index indicates a collision tile
        const x = (index % mapJson.width) * this.tileWidth;
        const y = Math.floor(index / mapJson.width) * this.tileHeight;
        collisionTiles.push({
          minX: x,
          minY: y,
          maxX: x + this.tileWidth,
          maxY: y + this.tileHeight,
        });
      }
    });
    this.collisionIndex.load(collisionTiles);

    // Extract spawn layer
    const spawnLayer = mapJson.layers.find(
      (layer) => layer.name === spawnLayerName
    );
    if (!spawnLayer || spawnLayer.type !== "tilelayer") {
      throw new Error(
        `Spawn layer "${spawnLayerName}" not found or is not a tile layer!`
      );
    }

    // Parse spawn tiles
    (spawnLayer.data as number[]).forEach((tileIndex, index) => {
      if (tileIndex !== 0) {
        // Non-zero tile index indicates a spawn tile
        const x = (index % mapJson.width) * this.tileWidth;
        const y = Math.floor(index / mapJson.width) * this.tileHeight;
        this.spawnTiles.push({
          x,
          y,
          width: this.tileWidth,
          height: this.tileHeight,
        });
      }
    });
  }

  /**
   * Returns a random spawn location from the spawn layer.
   * @returns An object containing x and y coordinates.
   */
  async getRandomSpawn(): Promise<{ x: number; y: number }> {
    if (this.spawnTiles.length === 0) {
      throw new Error("No spawn tiles found!");
    }

    // If there are no players, pick any random spawn tile
    if (this.players.size === 0) {
      console.warn("No players, picking random spawn.");
      const randomTile =
        this.spawnTiles[Math.floor(Math.random() * this.spawnTiles.length)];
      return {
        x: randomTile.x + this.tileWidth / 2,
        y: randomTile.y + this.tileHeight / 2,
      };
    }

    const minDistance = this.tileWidth; // Minimum distance from other players (adjust as needed)
    const maxIterations = 50; // Fallback after 50 iterations
    let iterations = 0;

    while (true) {
      const randomTile =
        this.spawnTiles[Math.floor(Math.random() * this.spawnTiles.length)];

      const spawnX = randomTile.x + this.tileWidth / 2; // Center the spawn
      const spawnY = randomTile.y + this.tileHeight / 2;

      // Check distance from all players
      const isFarEnough = Array.from(this.players.values()).every(
        (player: any) => {
          const distance =
            ((spawnX - player.x) ** 2 + (spawnY - player.y) ** 2) ** 0.5;
          return distance >= minDistance;
        }
      );

      console.log("Finding spawn", isFarEnough);

      if (isFarEnough) {
        return { x: spawnX, y: spawnY };
      }

      iterations++;
      if (iterations >= maxIterations) {
        console.warn(
          "Fallback spawn: Could not find a valid spawn after max iterations."
        );
        const fallbackTile =
          this.spawnTiles[Math.floor(Math.random() * this.spawnTiles.length)];
        return {
          x: fallbackTile.x + this.tileWidth / 2,
          y: fallbackTile.y + this.tileHeight / 2,
        };
      }

      // Delay for 10ms to prevent blocking
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * Checks if a given rectangle collides with any collision tiles.
   * @param x The x-coordinate of the rectangle.
   * @param y The y-coordinate of the rectangle.
   * @param width The width of the rectangle.
   * @param height The height of the rectangle.
   * @returns True if a collision is detected, false otherwise.
   */
  isColliding(x: number, y: number, width: number, height: number): boolean {
    const result = this.collisionIndex.search({
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height,
    });
    return result.length > 0;
  }

  getItemSpawnTiles(
    layer = "itemspawns",
    offsetX = 20,
    offsetY = 45
  ): { x: number; y: number }[] {
    const itemSpawnTiles: { x: number; y: number }[] = [];
    const itemLayer = this.mapJson.layers.find(
      (_layer: any) => _layer.name === layer
    );

    if (itemLayer && itemLayer.type === "tilelayer") {
      (itemLayer.data as number[]).forEach((tileIndex, index) => {
        if (tileIndex !== 0) {
          // Non-zero indicates a spawn tile
          const x = (index % this.mapJson.width) * this.tileWidth + offsetX;
          const y =
            Math.floor(index / this.mapJson.width) * this.tileHeight + offsetY;
          itemSpawnTiles.push({ x, y });
        }
      });
    }

    return itemSpawnTiles;
  }

  /**
   * Generates a collision grid for pathfinding.
   * 0 = walkable tile, 1 = collision tile.
   * @returns A 2D array representing the collision grid.
   */
  getCollisionGrid(): number[][] {
    const collisionGrid: number[][] = [];

    // Initialize the grid with empty rows
    for (let y = 0; y < this.mapJson.height; y++) {
      collisionGrid[y] = new Array(this.mapJson.width).fill(0);
    }

    // Populate the grid with collision data
    const collisionLayer = this.mapJson.layers.find(
      (layer: any) => layer.name === this.collisionLayerName // Replace with your collision layer name
    );

    if (!collisionLayer || collisionLayer.type !== "tilelayer") {
      throw new Error("Collision layer not found or is not a tile layer!");
    }

    (collisionLayer.data as number[]).forEach((tileIndex, index) => {
      const x = index % this.mapJson.width;
      const y = Math.floor(index / this.mapJson.width);

      // 0 indicates a walkable tile, non-zero is a collision
      collisionGrid[y][x] = tileIndex !== 0 ? 1 : 0;
    });

    return collisionGrid;
  }
}
