import { ArraySchema } from "@colyseus/schema";
import * as fs from "node:fs";
import type * as tiled from "@kayahr/tiled";
import RBush from "rbush";
import { Collision } from "./Collision";
import { Pickup } from "../schemas/Pickup";
import NavMesh, { buildPolysFromGridMap, PolyPoints } from "navmesh";

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
  collisionGrid: number[][];
  polyGrid: PolyPoints[];
  private navMesh: NavMesh;
  private readonly TILE_SIZE = 32; // Adjust based on actual tile size

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

    this.collisionGrid = collisionGrid;

    return collisionGrid;
  }

  getUpdatedPolyGridWithPickups(
    pickups: ArraySchema<Pickup>,
    padding: number = 15
  ): PolyPoints[] {
    // Clone the existing polyGrid to modify it safely
    const updatedPolyGrid: PolyPoints[] = this.polyGrid.map((polygon) => [
      ...polygon,
    ]);

    const pointsToRemove: PolyPoints[] = [];

    pickups.forEach((_pickup) => {
      const pickup = { ..._pickup };
      if (!pickup.blocking) return;

      const pickupWidth =
        (pickup.colissionWidth || pickup.width || 32) + padding * 2;
      const pickupHeight =
        (pickup.colissionHeight || pickup.height || 32) + padding * 2;
      const pickupX = pickup.x + (pickup.colissionOffsetX || 0);
      const pickupY = pickup.y + (pickup.colissionOffsetY || 0);
      const rotation = pickup.rotation || 0; // Rotation in radians

      // Define the original rectangle corners **relative to center**
      const halfWidth = pickupWidth / 2;
      const halfHeight = pickupHeight / 2;
      const corners: PolyPoints = [
        { x: pickupX - halfWidth, y: pickupY - halfHeight }, // Top-left
        { x: pickupX + halfWidth, y: pickupY - halfHeight }, // Top-right
        { x: pickupX + halfWidth, y: pickupY + halfHeight }, // Bottom-right
        { x: pickupX - halfWidth, y: pickupY + halfHeight }, // Bottom-left
      ];

      // **✅ Apply rotation to each point around the pickup's center**
      const rotatedPolygon: PolyPoints = corners.map(({ x, y }) => {
        const relativeX = x - pickupX;
        const relativeY = y - pickupY;
        const cosTheta = Math.cos(rotation);
        const sinTheta = Math.sin(rotation);

        const newX = cosTheta * relativeX - sinTheta * relativeY + pickupX;
        const newY = sinTheta * relativeX + cosTheta * relativeY + pickupY;

        return { x: newX, y: newY };
      });

      // ✅ Add the correctly rotated pickup polygon to the polyGrid
      pointsToRemove.push(rotatedPolygon);
    });

    this.polyGrid = updatedPolyGrid; // Update the stored polyGrid

    return updatedPolyGrid;
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

    this.collisionGrid = collisionGrid;

    return collisionGrid;
  }

  /**
   * Converts the tilemap collision grid into a polygon map for pathfinding.
   * @returns An array of polygons representing the walkable areas.
   */
  getPolygonMap(pickups: ArraySchema<Pickup>): PolyPoints[] {
    let polygons = this.convertGridToPolygons(); // ✅ Convert grid to polygons first

    this.navMesh = new NavMesh(polygons, this.TILE_SIZE * 2); // Adjust link distance if needed

    polygons = this.removePickupAreas(polygons, pickups); // ✅ Remove pickups from walkable areas
    polygons = this.mergePolygons(polygons); // 🚀 Merge adjacent polygons for simplification

    this.polyGrid = polygons;
    // this.navMesh = new NavMesh(polygons, this.TILE_SIZE * 2); // ✅ Create navMesh AFTER cleaning
    this.navMesh = new NavMesh(polygons, this.TILE_SIZE * 2); // Adjust link distance if needed

    return polygons;
  }

  convertGridToPolygons(): PolyPoints[] {
    let polygons: PolyPoints[] = [];

    for (let y = 0; y < this.collisionGrid.length; y++) {
      for (let x = 0; x < this.collisionGrid[y].length; x++) {
        if (this.collisionGrid[y][x] === 0) {
          // Walkable
          const poly: PolyPoints = [
            { x: x * this.tileWidth, y: y * this.tileHeight }, // Top-left
            { x: (x + 1) * this.tileWidth, y: y * this.tileHeight }, // Top-right
            { x: (x + 1) * this.tileWidth, y: (y + 1) * this.tileHeight }, // Bottom-right
            { x: x * this.tileWidth, y: (y + 1) * this.tileHeight }, // Bottom-left
          ];
          polygons.push(poly);
        }
      }
    }

    return polygons;
  }

  mergePolygons(polygons: PolyPoints[]): PolyPoints[] {
    let previousCount = polygons.length;
    let mergedPolygons = polygons;

    while (true) {
      let newPolygons = this.runSingleMergePass(mergedPolygons);
      if (newPolygons.length === previousCount) {
        break; // 🚀 Stop when no more merges happen
      }
      previousCount = newPolygons.length;
      mergedPolygons = newPolygons;
    }

    return mergedPolygons;
  }

  /**
   * ✅ Runs a single merge pass through the polygons.
   */
  runSingleMergePass(polygons: PolyPoints[]): PolyPoints[] {
    let mergedPolygons: PolyPoints[] = [];
    let used = new Set();

    polygons.sort((a, b) => a[0].y - b[0].y || a[0].x - b[0].x); // Sort top-left to bottom-right

    for (let i = 0; i < polygons.length; i++) {
      if (used.has(i)) continue;
      let basePolygon = polygons[i];

      let merged = false;

      for (let j = i + 1; j < polygons.length; j++) {
        if (used.has(j)) continue;
        let candidatePolygon = polygons[j];

        // 🚀 Check if they align perfectly for merging
        if (this.canMergePolygons(basePolygon, candidatePolygon)) {
          let newPoly = this.mergeTwoPolygons(basePolygon, candidatePolygon);
          mergedPolygons.push(newPoly);
          used.add(i);
          used.add(j);
          merged = true;
          break; // Stop after merging
        }
      }

      if (!merged) {
        mergedPolygons.push(basePolygon);
      }
    }

    return mergedPolygons;
  }

  /**
   * ✅ Checks if two polygons can be merged by seeing if they share a FULL aligned edge.
   */
  canMergePolygons(polyA: PolyPoints, polyB: PolyPoints): boolean {
    let sharedEdges = 0;

    // Compare the bounding boxes
    const [aMinX, aMinY, aMaxX, aMaxY] = this.getBoundingBox(polyA);
    const [bMinX, bMinY, bMaxX, bMaxY] = this.getBoundingBox(polyB);

    // Horizontal merge (if they are the same height and side by side)
    if (
      aMinY === bMinY &&
      aMaxY === bMaxY &&
      (aMaxX === bMinX || bMaxX === aMinX)
    ) {
      return true;
    }

    // Vertical merge (if they are the same width and stacked on top)
    if (
      aMinX === bMinX &&
      aMaxX === bMaxX &&
      (aMaxY === bMinY || bMaxY === aMinY)
    ) {
      return true;
    }

    return false;
  }

  /**
   * ✅ Merge two adjacent polygons into one rectangle.
   */
  mergeTwoPolygons(polyA: PolyPoints, polyB: PolyPoints): PolyPoints {
    const [minX, minY, maxX, maxY] = this.getBoundingBox([...polyA, ...polyB]);

    return [
      { x: minX, y: minY }, // Top-left
      { x: maxX, y: minY }, // Top-right
      { x: maxX, y: maxY }, // Bottom-right
      { x: minX, y: maxY }, // Bottom-left
    ];
  }

  /**
   * ✅ Gets the bounding box of a polygon (min/max x and y).
   */
  getBoundingBox(poly: PolyPoints): [number, number, number, number] {
    const minX = Math.min(...poly.map((p) => p.x));
    const minY = Math.min(...poly.map((p) => p.y));
    const maxX = Math.max(...poly.map((p) => p.x));
    const maxY = Math.max(...poly.map((p) => p.y));
    return [minX, minY, maxX, maxY];
  }

  removePickupAreas(
    polygons: PolyPoints[],
    pickups: ArraySchema<Pickup>,
    padding: number = 1
  ): PolyPoints[] {
    return polygons.filter((polygon) => {
      return !pickups.some((pickup) => {
        if (!pickup.blocking) return false;

        const pickupWidth =
          (pickup.colissionWidth || pickup.width || 32) + padding * 2;
        const pickupHeight =
          (pickup.colissionHeight || pickup.height || 32) + padding * 2;
        const pickupX = pickup.x + (pickup.colissionOffsetX || 0);
        const pickupY = pickup.y + (pickup.colissionOffsetY || 0);
        const rotation = pickup.rotation || 0; // Rotation in radians

        // **✅ Create the rotated polygon for the pickup**
        const halfWidth = pickupWidth / 2;
        const halfHeight = pickupHeight / 2;
        const pickupPolygon: PolyPoints = [
          { x: pickupX - halfWidth, y: pickupY - halfHeight }, // Top-left
          { x: pickupX + halfWidth, y: pickupY - halfHeight }, // Top-right
          { x: pickupX + halfWidth, y: pickupY + halfHeight }, // Bottom-right
          { x: pickupX - halfWidth, y: pickupY + halfHeight }, // Bottom-left
        ].map(({ x, y }) => {
          const relativeX = x - pickupX;
          const relativeY = y - pickupY;
          const cosTheta = Math.cos(rotation);
          const sinTheta = Math.sin(rotation);
          return {
            x: cosTheta * relativeX - sinTheta * relativeY + pickupX,
            y: sinTheta * relativeX + cosTheta * relativeY + pickupY,
          };
        });

        // **🚨 Remove only polygons that overlap with the pickup polygon**
        return polygon.some((point) =>
          this.isPointInsidePolygon(point, pickupPolygon)
        );
      });
    });
  }

  /**
   * ✅ Checks if a point is inside a polygon
   */
  isPointInsidePolygon(
    point: { x: number; y: number },
    polygon: PolyPoints
  ): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  logCollisionGrid() {
    console.log("🗺 Collision Grid:");
    this.collisionGrid.forEach((row, y) => {
      console.log(
        `${row.map((cell) => (cell === 1 ? "🟥" : "⬜")).join("")}  ${y}`
      );
    });
  }

  logPolygonMap() {
    const polygons = this.polyGrid; // Get polygon map from TilemapManager
    if (!polygons || polygons.length === 0) {
      console.warn("🚨 No polygons found in polyGrid!");
      return;
    }

    console.log("🔷 Polygon Map (NavMesh):");

    // Determine the bounds of the grid
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    polygons.forEach((polygon) => {
      polygon.forEach(({ x, y }) => {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      });
    });

    const gridWidth = Math.ceil((maxX - minX) / this.tileWidth);
    const gridHeight = Math.ceil((maxY - minY) / this.tileHeight);

    // Initialize empty grid with spaces
    const grid: string[][] = Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill("⬛"));

    // Mark polygon points on the grid
    polygons.forEach((polygon, polyIndex) => {
      polygon.forEach(({ x, y }) => {
        const gridX = Math.floor((x - minX) / this.tileWidth);
        const gridY = Math.floor((y - minY) / this.tileHeight);
        if (
          gridY >= 0 &&
          gridY < gridHeight &&
          gridX >= 0 &&
          gridX < gridWidth
        ) {
          grid[gridY][gridX] = "🟦"; // Mark polygon points with blue squares
        }
      });
    });

    // Print the grid row by row
    for (let y = 0; y < gridHeight; y++) {
      console.log(grid[y].join("") + `  ${y}`);
    }
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

    const path = this.navMesh.findPath(start, end);

    if (!path || path.length === 0) {
      return [];
    }

    return path;
  }
}
