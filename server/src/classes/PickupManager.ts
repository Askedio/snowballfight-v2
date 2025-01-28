import type { Room } from "colyseus";
import type { TilemapManager } from "../classes/TilemapManager";
import { pickupItemTypes } from "../pickups";
import { PickupFactory } from "../pickups/PickupFactory";
import { nanoid } from "nanoid";

export class PickupManager {
  private tilemapManager: TilemapManager;

  constructor(tilemapManager: TilemapManager) {
    this.tilemapManager = tilemapManager;
  }

  /**
   * Removes all pickups from the room.
   */
  removeAllPickups(room: Room) {
    room.state.pickups = [];
  }

  /**
   * Spawns random pickups on the specified layer.
   * @param room - The room instance
   * @param layer - The layer name to spawn pickups (default: "itemspawns")
   */
  spawnRandomPickups(room: Room, layer = "itemspawns") {
    const spawnTiles = this.tilemapManager.getItemSpawnTiles(layer); // Get all spawn tiles
    let itemsSpawned = 0;
    const maxItems = 40; // Limit to 40 items
    const regions = [
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

    // Shuffle regions to randomize the order
    regions.sort(() => Math.random() - 0.5);

    // Calculate the number of items each region should get
    const itemsPerRegion = Math.floor(maxItems / regions.length);
    let remainingItems = maxItems % regions.length; // Items left after even distribution

    regions.forEach((region) => {
      let regionItemCount = itemsPerRegion;
      if (remainingItems > 0) {
        regionItemCount++;
        remainingItems--;
      }

      if (itemsSpawned >= maxItems) return;

      const regionTiles = spawnTiles.filter(
        (tile) =>
          tile.x >= region.x1 &&
          tile.x <= region.x2 &&
          tile.y >= region.y1 &&
          tile.y <= region.y2
      );

      if (regionTiles.length > regionItemCount) {
        regionTiles.sort(() => Math.random() - 0.5);
        regionTiles.splice(regionItemCount);
      }

      regionTiles.forEach((tile) => {
        if (itemsSpawned >= maxItems) return;

        const randomType =
          pickupItemTypes[Math.floor(Math.random() * pickupItemTypes.length)];

        const pickup = PickupFactory.createPickup(randomType, tile.x, tile.y);
        if (!pickup) return;

        pickup.id = nanoid();
        pickup.originalX = tile.x;
        pickup.originalY = tile.y;

        room.state.pickups.push(pickup);
        itemsSpawned++;
      });
    });
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

    const pickup = PickupFactory.createPickup(pickupType, x, y);
    if (!pickup) return;

    pickup.id = nanoid();
    pickup.originalX = x;
    pickup.originalY = y;

    room.state.pickups.push(pickup);
  }
}
