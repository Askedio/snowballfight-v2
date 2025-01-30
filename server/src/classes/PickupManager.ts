import { ArraySchema } from '@colyseus/schema';
import type { Room } from "colyseus";
import type { TilemapManager } from "../classes/TilemapManager";
import { pickupItemTypes } from "../pickups";
import { PickupFactory } from "../pickups/PickupFactory";
import { nanoid } from "nanoid";
import { Pickup } from '../schemas/Pickup';

export class PickupManager {
  private tilemapManager: TilemapManager;
  private readonly maxItems = 40;
  private usedTiles = new Set<string>(); // Track used tiles to prevent duplicate pickups

  constructor(tilemapManager: TilemapManager) {
    this.tilemapManager = tilemapManager;
  }

  /**
   * Removes all pickups from the room and clears used tile tracking.
   */
  removeAllPickups(room: Room) {
    room.state.pickups = new ArraySchema<Pickup>();
    this.usedTiles.clear();
  }

  /**
   * Returns predefined regions in the map.
   */
  private getRegions(room: Room) {
    return [
      {
        name: "top",
        x1: 0,
        y1: 0,
        x2: room.state.mapWidth,
        y2: room.state.mapHeight * 0.25,
      },
      {
        name: "bottom",
        x1: 0,
        y1: room.state.mapHeight * 0.75,
        x2: room.state.mapWidth,
        y2: room.state.mapHeight,
      },
      {
        name: "left",
        x1: 0,
        y1: 0,
        x2: room.state.mapWidth * 0.25,
        y2: room.state.mapHeight,
      },
      {
        name: "right",
        x1: room.state.mapWidth * 0.75,
        y1: 0,
        x2: room.state.mapWidth,
        y2: room.state.mapHeight,
      },
      {
        name: "center",
        x1: room.state.mapWidth * 0.25,
        y1: room.state.mapHeight * 0.25,
        x2: room.state.mapWidth * 0.75,
        y2: room.state.mapHeight * 0.75,
      },
    ];
  }

  /**
   * Ensures the exact number of pickups are spawned evenly across regions.
   */
  private spawnPickupsInRegions(
    room: Room,
    spawnTiles: { x: number; y: number }[],
    pickupTypes: string[],
    count: number
  ) {
    let itemsSpawned = 0;
    const regions = this.getRegions(room);
    regions.sort(() => Math.random() - 0.5); // Shuffle for randomness

    // ✅ Filter out empty regions that have no valid tiles
    const validRegions = regions
      .map((region) => ({
        ...region,
        tiles: spawnTiles.filter(
          (tile) =>
            tile.x >= region.x1 &&
            tile.x <= region.x2 &&
            tile.y >= region.y1 &&
            tile.y <= region.y2 &&
            !this.usedTiles.has(`${tile.x},${tile.y}`)
        ),
      }))
      .filter((region) => region.tiles.length > 0); // Remove regions with no valid tiles

    if (validRegions.length === 0) {
      console.warn(`🚨 No valid regions with available tiles!`);
      return;
    }

    // ✅ Adjust distribution of pickups based on available regions
    const itemsPerRegion = Math.floor(count / validRegions.length);
    let remainingItems = count % validRegions.length;

    validRegions.forEach((region) => {
      let regionItemCount = itemsPerRegion + (remainingItems-- > 0 ? 1 : 0);
      if (itemsSpawned >= count) return;

      // Shuffle and pick valid tiles
      let regionTiles = [...region.tiles].sort(() => Math.random() - 0.5);
      regionTiles = regionTiles.slice(0, regionItemCount);

      regionTiles.forEach((tile) => {
        if (itemsSpawned >= count) return;
        this.createPickup(room, tile.x, tile.y, pickupTypes);
        itemsSpawned++;
      });
    });

    // ✅ Final check to ensure all requested pickups were placed
    if (itemsSpawned < count) {
      console.warn(
        `⚠️ Only spawned ${itemsSpawned} of ${count} requested pickups!`
      );
    }
  }

  /**
   * Spawns a pickup at a location and marks the tile as used.
   */
  private createPickup(
    room: Room,
    x: number,
    y: number,
    pickupTypes: string[]
  ) {
    const randomType =
      pickupTypes[Math.floor(Math.random() * pickupTypes.length)];
    const pickup = PickupFactory.createPickup(randomType, x, y);
    if (!pickup) return;

    pickup.id = nanoid();
    pickup.originalX = x;
    pickup.originalY = y;

    room.state.pickups.push(pickup);
    this.usedTiles.add(`${x},${y}`); // Mark tile as used
  }

  /**
   * Spawns pickups of a specific type on a layer.
   * @param room - The room instance
   * @param count - The number of pickups to spawn (ALWAYS spawns exact count)
   * @param pickupType - The type(s) of pickups to spawn
   * @param layer - The layer name (default: "itemspawns")
   * @param useRegions - Whether to use regional distribution (default: true)
   */
  spawnPickupsByType(
    room: Room,
    count: number,
    pickupType: string | string[],
    layer = "itemspawns",
    useRegions = true
  ) {
    const spawnTiles = this.tilemapManager.getItemSpawnTiles(layer);
    if (spawnTiles.length === 0) {
      console.warn(`🚨 No available spawn tiles found on layer: ${layer}`);
      return;
    }

    const pickupTypes = Array.isArray(pickupType) ? pickupType : [pickupType];

    if (useRegions) {
      this.spawnPickupsInRegions(room, spawnTiles, pickupTypes, count);
      return;
    }

    let availableTiles = spawnTiles.filter(
      (tile) => !this.usedTiles.has(`${tile.x},${tile.y}`)
    );

    if (availableTiles.length < count) {
      console.warn(
        `⚠️ Not enough unique tiles! Reducing spawn count to ${availableTiles.length}.`
      );
      count = availableTiles.length;
    }

    let itemsSpawned = 0;
    while (itemsSpawned < count) {
      if (availableTiles.length === 0) {
        console.warn(`🚨 No more available tiles for spawning!`);
        break;
      }

      const tileIndex = Math.floor(Math.random() * availableTiles.length);
      const tile = availableTiles.splice(tileIndex, 1)[0];

      this.createPickup(room, tile.x, tile.y, pickupTypes);
      itemsSpawned++;
    }
  }

  /**
   * Spawns a specific pickup at a location from an object layer.
   * @param room - The room instance
   * @param objectLayerName - The name of the object layer
   * @param objectName - The name of the object
   * @param pickupType - The type of pickup to spawn
   */
  spawnPickupFromObjectLayer(
    room: Room,
    objectLayerName: string,
    objectName: string,
    pickupType: string
  ) {
    const objectLayer = this.tilemapManager.mapJson.layers.find(
      (layer: any) =>
        layer.name === objectLayerName && layer.type === "objectgroup"
    );

    if (!objectLayer) {
      throw new Error(
        `Object layer "${objectLayerName}" not found or is not an object group!`
      );
    }

    const object = objectLayer.objects.find(
      (obj: any) => obj.name === objectName
    );

    if (!object) {
      throw new Error(
        `Object "${objectName}" not found in layer "${objectLayerName}"!`
      );
    }

    const x = object.x + object.width / 2;
    const y = object.y + object.height / 2;

    this.createPickup(room, x, y, [pickupType]);
  }
}
