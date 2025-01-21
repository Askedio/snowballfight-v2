import { Command } from "@colyseus/command";
import type { Part4Room } from "../rooms/Part4Room";
import type { Client } from "colyseus";
import { MyRoomState } from "../states/MyRoomState";
import type { TilemapManager } from "../TilemapManager";
import { PickupFactory } from "../PickupFactory";
import { nanoid } from "nanoid";
import { ChatMessage } from "../schemas/ChatMessage";
import type { InputData } from "../interfaces/InputData";
import { Player } from "../schemas/Player";
import { RandomNameGenerator } from "../RandomNameGenerator";

export class OnCreateCommand extends Command<
  Part4Room,
  { tilemapManager: TilemapManager }
> {
  private tilemapManager: TilemapManager;
  fixedTimeStep = 1000 / 60;

  execute(payload: this["payload"]) {
    this.room.setState(new MyRoomState());

    this.room.maxClients = 20; // Adjust the number as needed

    this.tilemapManager = payload.tilemapManager;

    this.spawnPickups();

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
    this.room.onMessage("rejoin", (client, { playerName, roomName, skin }) => {
      // Check if the player exists in the room state
      let player = this.room.state.players.get(client.sessionId);

      if (!player) {
        // If the player does not exist, create one
        console.log(
          `${client.sessionId} creating player state in room ${roomName}, skin ${skin}.`
        );
        this.createPlayer(client, skin);
        player = this.room.state.players.get(client.sessionId); // Re-fetch the player
      }

      if (player) {
        if (player.isDead) {
          console.log(`${client.sessionId} is respawning to room ${roomName}.`);
          player.health = 100; // Restore health
          if (skin) {
            player.skin = skin;
          }
          player.isDead = false; // Mark as alive
          this.assignRandomPosition(player); // Respawn at a new position
        }

        // Assign player name
        const generator = new RandomNameGenerator();

        player.name = playerName || generator.generateRandomName().name; // Fallback to a default name if playerName is not provided
      } else {
        console.warn(
          `Failed to create or fetch player for ${client.sessionId}`
        );
      }
    });

    let elapsedTime = 0;
    this.room.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.room.fixedTick(this.fixedTimeStep);
      }
    });
  }

  private spawnPickups() {
    const itemTypes = ["devil", "skull", "sword", "treasure", "wings"];
    const assets = {
      devil: "assets/images/pickups/devil.png",
      skull: "assets/images/pickups/skull.png",
      sword: "assets/images/pickups/sword.png",
      treasure: "assets/images/pickups/treasure.png",
      wings: "assets/images/pickups/wings.png",
    };

    const spawnTiles = this.tilemapManager.getItemSpawnTiles(); // Add this method to TilemapManager

    spawnTiles.forEach((tile) => {
      const randomType = itemTypes[
        Math.floor(Math.random() * itemTypes.length)
      ] as keyof typeof assets;

      const pickup = PickupFactory.createPickup(
        randomType,
        tile.x,
        tile.y,
        assets[randomType]
      );

      if (!pickup) return;

      pickup.id = nanoid(); // Generate unique ID
      this.room.state.pickups.push(pickup);
    });
  }

  createPlayer(client: Client, skin: string) {
    const player = new Player();

    // Assign a new random position
    this.assignRandomPosition(player);

    // Respawn player with full health
    player.health = 100;
    player.isDead = false;
    if (!skin) {
      player.skin = this.assignRandomSkin();
    } else {
      player.skin = skin
    }

    this.room.state.players.set(client.sessionId, player);
  }

  private assignRandomPosition(player: Player) {
    try {
      const spawn = this.tilemapManager.getRandomSpawn();
      player.x = spawn.x;
      player.y = spawn.y;
    } catch (error) {
      console.error("Error assigning spawn position:", error);
      // Fallback to a default position
      player.x = 400;
      player.y = 300;
    }
  }

  private assignRandomSkin(): string {
    const availableSkins = ["playersa", "playersb", "playersc", "playersd"];
    return availableSkins[Math.floor(Math.random() * availableSkins.length)];
  }
}
