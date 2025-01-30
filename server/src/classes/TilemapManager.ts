import { ArraySchema } from "@colyseus/schema";
import * as fs from "node:fs";
import type * as tiled from "@kayahr/tiled";
import RBush from "rbush";
import { Collision } from "./Collision";
import { Pickup } from "../schemas/Pickup";

export interface TilemapLayersConfig {
  base: string;
  collisions: string;
  land: string;
  spawnLayer: string | SpawnLayerConfig;
}

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
export interface SpawnLayerConfig {
  [team: string]: string;
}

export type SpawnLayers = string | SpawnLayerConfig;

export class TilemapManager {
  collisionIndex: RBush<CollisionTile>;
  spawnTiles: { [key: string]: TileBounds[] } = {}; // Stores tiles for each layer
  tileWidth: number;
  tileHeight: number;
  mapJson: any;
  private players: any;
  collisionLayerName: string;
  spawnLayerName: string | { [team: string]: string };
  collisionSystem: Collision;

  constructor(
    mapFilePath: string,
    collisionLayerName: string,
    spawnLayerName: string | { [team: string]: string },
    players: any,
    collisionSystem: Collision
  ) {
    this.players = players;
    this.collisionIndex = new RBush<CollisionTile>();
    this.collisionLayerName = collisionLayerName;
    this.spawnLayerName = spawnLayerName;
    this.collisionSystem = collisionSystem;

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

    // Extract spawn layers
    if (typeof this.spawnLayerName === "string") {
      this.spawnTiles.default = this.extractSpawnTiles(this.spawnLayerName);
    } else {
      for (const [team, layerName] of Object.entries(this.spawnLayerName)) {
        this.spawnTiles[team] = this.extractSpawnTiles(layerName);
      }
    }
  }

  /**
   * Extracts spawn tiles from a given layer name.
   * @param layerName The name of the layer to extract tiles from.
   * @returns An array of TileBounds.
   */
  private extractSpawnTiles(layerName: string): TileBounds[] {
    const spawnTiles: TileBounds[] = [];
    const spawnLayer = this.mapJson.layers.find(
      (layer: any) => layer.name === layerName
    );

    if (!spawnLayer || spawnLayer.type !== "tilelayer") {
      throw new Error(
        `Spawn layer "${layerName}" not found or is not a tile layer!`
      );
    }

    (spawnLayer.data as number[]).forEach((tileIndex, index) => {
      if (tileIndex !== 0) {
        const x = (index % this.mapJson.width) * this.tileWidth;
        const y = Math.floor(index / this.mapJson.width) * this.tileHeight;
        spawnTiles.push({
          x,
          y,
          width: this.tileWidth,
          height: this.tileHeight,
        });
      }
    });

    return spawnTiles;
  }

  /**
   * Returns a random spawn location from the specified layer or team.
   * @param team The team name or "default" for non-team-based spawns.
   * @returns An object containing x and y coordinates.
   */
  async getRandomSpawn(_team = "default"): Promise<{ x: number; y: number }> {
    const team = _team || "default";
    const spawnTiles = this.spawnTiles[team];

    if (!spawnTiles || spawnTiles.length === 0) {
      throw new Error(`No spawn tiles found for team "${team}"!`);
    }

    if (this.players.size === 0) {
      const randomTile =
        spawnTiles[Math.floor(Math.random() * spawnTiles.length)];
      return {
        x: randomTile.x + this.tileWidth / 2,
        y: randomTile.y + this.tileHeight / 2,
      };
    }

    const minDistance = this.tileWidth;
    const maxIterations = 50;
    let iterations = 0;

    while (true) {
      const randomTile =
        spawnTiles[Math.floor(Math.random() * spawnTiles.length)];

      const spawnX = randomTile.x + this.tileWidth / 2;
      const spawnY = randomTile.y + this.tileHeight / 2;

      const isFarEnough = Array.from(this.players.values()).every(
        (player: any) => {
          const distance = Math.hypot(spawnX - player.x, spawnY - player.y);
          return distance >= minDistance;
        }
      );

      if (isFarEnough) {
        return { x: spawnX, y: spawnY };
      }

      iterations++;
      if (iterations >= maxIterations) {
        const fallbackTile =
          spawnTiles[Math.floor(Math.random() * spawnTiles.length)];
        return {
          x: fallbackTile.x + this.tileWidth / 2,
          y: fallbackTile.y + this.tileHeight / 2,
        };
      }

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

  getUpdatedCollisionGridWithPickups(pickups: ArraySchema<Pickup>): number[][] {
    const collisionGrid = this.getCollisionGrid().map((row) => [...row]);

    const tileWidth = this.tileWidth;
    const tileHeight = this.tileHeight;

    // Loop through every tile in the grid
    for (let y = 0; y < collisionGrid.length; y++) {
        for (let x = 0; x < collisionGrid[0].length; x++) {
            const tileCenterX = x * tileWidth + tileWidth / 2;
            const tileCenterY = y * tileHeight + tileHeight / 2;

            // Check if this tile collides with any blocking pickup
            const isBlocked = pickups.some((pickup) => {
                if (!pickup.blocking) return false;

                const pickupWidth = pickup.colissionWidth || pickup.width || 32;
                const pickupHeight = pickup.colissionHeight || pickup.height || 32;
                const pickupX = pickup.x + (pickup.colissionOffsetX || 0);
                const pickupY = pickup.y + (pickup.colissionOffsetY || 0);

                // Correctly align bounding box (assuming pickup.x/y is center)
                const pickupShape = {
                    type: pickup.collisionshape || "circle",
                    x: pickupX - pickupWidth / 2, // Adjust to top-left corner
                    y: pickupY - pickupHeight / 2,
                    width: pickupWidth,
                    height: pickupHeight,
                    radius: pickup.radius || Math.max(pickupWidth, pickupHeight) / 2,
                    rotation: pickup.rotation || 0,
                };

                const tileShape = {
                    type: "box",
                    x: tileCenterX - tileWidth / 2, // Adjust to top-left corner
                    y: tileCenterY - tileHeight / 2,
                    width: tileWidth,
                    height: tileHeight,
                };

                return this.collisionSystem.detectCollision(pickupShape, tileShape);
            });

            if (isBlocked) {
                collisionGrid[y][x] = 1; // Mark as blocked
            }
        }
    }

    return collisionGrid;
}

}
