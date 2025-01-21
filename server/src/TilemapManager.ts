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

  constructor(
    mapFilePath: string,
    collisionLayerName: string,
    spawnLayerName: string
  ) {
    this.collisionIndex = new RBush<CollisionTile>();

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
  getRandomSpawn(): { x: number; y: number } {
    if (this.spawnTiles.length === 0) {
      throw new Error("No spawn tiles found!");
    }
    const randomTile =
      this.spawnTiles[Math.floor(Math.random() * this.spawnTiles.length)];
    return {
      x: randomTile.x + this.tileWidth / 2, // Center the spawn
      y: randomTile.y + this.tileHeight / 2,
    };
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

  getItemSpawnTiles(offsetX = 20, offsetY = 45): { x: number; y: number }[] {
    const itemSpawnTiles: { x: number; y: number }[] = [];
    const itemLayer = this.mapJson.layers.find(
        (layer: any) => layer.name === "itemspawns"
    );

    if (itemLayer && itemLayer.type === "tilelayer") {
        (itemLayer.data as number[]).forEach((tileIndex, index) => {
            if (tileIndex !== 0) {
                // Non-zero indicates a spawn tile
                const x = (index % this.mapJson.width) * this.tileWidth + offsetX;
                const y = Math.floor(index / this.mapJson.width) * this.tileHeight + offsetY;
                itemSpawnTiles.push({ x, y });
            }
        });
    }

    return itemSpawnTiles;
}

}
