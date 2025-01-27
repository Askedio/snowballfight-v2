import type { Room } from "colyseus";
import type { TilemapManager } from "../TilemapManager";
import { pickupItemTypes } from "../pickups";
import { PickupFactory } from "../pickups/PickupFactory";
import { nanoid } from "nanoid";

export function removeAllPickups(tilemapManager: TilemapManager, room: Room) {
  room.state.pickups = [];
}

export function spawnPickups(
  tilemapManager: TilemapManager,
  room: Room,
  type = "all",
  layer = "itemspawns"
) {
  const spawnTiles = tilemapManager.getItemSpawnTiles(layer); // Get all spawn tiles

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

  // Iterate through regions and spawn items
  regions.forEach((region) => {
    // Ensure we distribute items equally across regions
    let regionItemCount = itemsPerRegion;
    if (remainingItems > 0) {
      regionItemCount++; // If there are remaining items, give one more to this region
      remainingItems--;
    }

    if (itemsSpawned >= maxItems) return;

    // Filter spawn tiles in the current region
    const regionTiles = spawnTiles.filter(
      (tile) =>
        tile.x >= region.x1 &&
        tile.x <= region.x2 &&
        tile.y >= region.y1 &&
        tile.y <= region.y2
    );

    // If the region has fewer tiles than the item count, randomly shuffle and pick the necessary amount
    if (regionTiles.length > regionItemCount) {
      regionTiles.sort(() => Math.random() - 0.5); // Shuffle the tiles
      regionTiles.splice(regionItemCount); // Take only the required number of tiles
    }

    // Spawn the items for this region
    regionTiles.forEach((tile) => {
      if (itemsSpawned >= maxItems) return;

      const randomType =
        pickupItemTypes[Math.floor(Math.random() * pickupItemTypes.length)];

      const pickup = PickupFactory.createPickup(randomType, tile.x, tile.y);

      if (!pickup) return;

      pickup.id = nanoid(); // Generate unique ID
      room.state.pickups.push(pickup);

      itemsSpawned++; // Increment the counter after spawning an item
    });
  });
}
