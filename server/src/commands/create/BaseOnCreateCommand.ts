import { Command } from "@colyseus/command";
import { matchMaker, type Client } from "colyseus";
import type { TilemapManager } from "../../TilemapManager";
import { PickupFactory } from "../../pickups/PickupFactory";
import { nanoid } from "nanoid";
import { ChatMessage } from "../../schemas/ChatMessage";
import type { InputData } from "../../interfaces/InputData";
import { Player } from "../../schemas/Player";
import { RandomNameGenerator } from "../../RandomNameGenerator";
import { pickupItemTypes } from "../../pickups";
import { assignRandomPosition, resetPlayer } from "../../lib/player.lib";
import type { BaseRoom } from "../../rooms/BaseRoom";
import type { BaseRoomState } from "../../states/BaseRoomState";

// When a room is created.
export class BaseOnCreateCommand<
  TRoom extends BaseRoom<TState>, // Room type that extends BaseRoom with TState
  TState extends BaseRoomState // The schema (state) type for the room
  // The schema (state) type for the room
> extends Command<TRoom, { tilemapManager: TilemapManager; maxBots: number }> {
  tilemapManager: TilemapManager;
  fixedTimeStep = 1000 / 60;

  async execute(payload: this["payload"]) {
    this.tilemapManager = payload.tilemapManager;

    this.spawnPickups();

    for (let i = 0; i < payload.maxBots; i++) {
      await this.createPlayer(null, null, "bot");
    }

    /*
    setInterval(async () => {
      const stats = await matchMaker.query({ name: "ffa_room" });
      console.log(stats);

      const globalCCU = await matchMaker.stats.getGlobalCCU();
      console.log(globalCCU);

      const roomCount = matchMaker.stats.local.roomCount;
      console.log(roomCount);

      const rooms = await matchMaker.query({ name: "battle" });
      console.log(rooms);
    }, 1000);*/

    this.room.onMessage("chat", (client, { message }) => {
      const player = this.room.state.players.get(client.sessionId);

      if (player && message?.trim() !== "") {
        const chatMessage = new ChatMessage();
        chatMessage.playerName = player.name || "Anonymous";
        chatMessage.message = message;
        chatMessage.timestamp = Date.now();

        // Add the chat message to the state
        this.room.state.chat.push(chatMessage);

        // Broadcast the chat message to all clients
        this.room.broadcast("chat", {
          playerName: chatMessage.playerName,
          message: chatMessage.message,
          timestamp: chatMessage.timestamp,
        });
      }
    });

    this.room.onMessage("input", (client, input: InputData) => {
      const player = this.room.state.players.get(client.sessionId);
      if (player && !player.isDead) {
        player.inputQueue.push(input);
      }
    });

    // Rejoin message handler
    this.room.onMessage(
      "rejoin",
      async (client, { playerName, roomName, skin }) => {
        console.log("Player attempting to rejoin...");
        // Check if the player exists in the room state
        let player = this.room.state.players.get(client.sessionId);

        if (!player) {
          // If the player does not exist, create one
          console.log(
            `${
              client.sessionId
            } creating player state in room ${roomName}, skin ${
              skin || "random"
            }.`
          );
          await this.createPlayer(client, skin);
          player = this.room.state.players.get(client.sessionId); // Re-fetch the player
        }

        if (player) {
          if (playerName !== "") {
            player.name = playerName;
          } else {
            const generator = new RandomNameGenerator();

            player.name = player.name || generator.generateRandomName().name; // Fallback to a default name if playerName is not provided
          }
          console.log(`${client.sessionId} is respawning to room ${roomName}.`);
          if (skin) {
            player.skin = skin;
          }

          if (player.canRespawn()) {
            await resetPlayer(player, this.tilemapManager);

            this.room.broadcast("client-respawned", {
              sessionId: client.sessionId,
            });
          }
        } else {
          console.warn(
            `Failed to create or fetch player for ${client.sessionId}`
          );
        }
      }
    );

    let elapsedTime = 0;
    this.room.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.room.fixedTick();
      }
    });
  }

  spawnPickups() {
    const spawnTiles = this.tilemapManager.getItemSpawnTiles(); // Get all spawn tiles

    let itemsSpawned = 0;
    const maxItems = 40; // Limit to 40 items
    const regions = [
      {
        name: "top",
        x1: 0,
        y1: 0,
        x2: this.room.state.mapWidth,
        y2: this.room.state.mapHeight * 0.25,
      },
      {
        name: "bottom",
        x1: 0,
        y1: this.room.state.mapHeight * 0.75,
        x2: this.room.state.mapWidth,
        y2: this.room.state.mapHeight,
      },
      {
        name: "left",
        x1: 0,
        y1: 0,
        x2: this.room.state.mapWidth * 0.25,
        y2: this.room.state.mapHeight,
      },
      {
        name: "right",
        x1: this.room.state.mapWidth * 0.75,
        y1: 0,
        x2: this.room.state.mapWidth,
        y2: this.room.state.mapHeight,
      },
      {
        name: "center",
        x1: this.room.state.mapWidth * 0.25,
        y1: this.room.state.mapHeight * 0.25,
        x2: this.room.state.mapWidth * 0.75,
        y2: this.room.state.mapHeight * 0.75,
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
        this.room.state.pickups.push(pickup);

        itemsSpawned++; // Increment the counter after spawning an item
      });
    });
  }

  async createPlayer(
    client: Client,
    skin: string,
    type: "human" | "bot" = "human"
  ) {
    const player = new Player();

    // Assign a new random position
    await assignRandomPosition(player, this.tilemapManager);

    player.type = type;

    if (!skin) {
      player.skin = this.assignRandomSkin();
    } else {
      player.skin = skin;
    }

    if (type === "bot") {
      player.sessionId = `bot_${nanoid()}`; // Assign unique ID for bots
      this.room.state.players.set(player.sessionId, player);

      const generator = new RandomNameGenerator();
      player.name = generator.generateRandomName().name;
    } else {
      player.sessionId = client.sessionId;
      this.room.state.players.set(client.sessionId, player);
    }

    return player;
  }

  assignRandomSkin(): string {
    const availableSkins = ["playersa", "playersb", "playersc", "playersd"];

    return availableSkins[Math.floor(Math.random() * availableSkins.length)];
  }
}
