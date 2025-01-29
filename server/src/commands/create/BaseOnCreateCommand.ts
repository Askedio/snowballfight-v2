import { Command } from "@colyseus/command";
import type { Client } from "colyseus";
import type { TilemapManager } from "../../classes/TilemapManager";
import { nanoid } from "nanoid";
import { ChatMessage } from "../../schemas/ChatMessage";
import type { InputData } from "../../interfaces/InputData";
import { Player } from "../../schemas/Player";
import { RandomNameGenerator } from "../../classes/RandomNameGenerator";
import type { BaseRoom } from "../../rooms/BaseRoom";
import type { BaseRoomState } from "../../states/BaseRoomState";
import { Profanity } from "@2toad/profanity";
import { PickupManager } from "../../classes/PickupManager";

const profanity = new Profanity({
  languages: ["ar", "zh", "en", "fr", "de", "hi", "ja", "ko", "pt", "ru", "es"],
});

// When a room is created.
export class BaseOnCreateCommand<
  TRoom extends BaseRoom<TState>,
  TState extends BaseRoomState
> extends Command<TRoom, { tilemapManager: TilemapManager; maxBots: number }> {
  tilemapManager: TilemapManager;
  fixedTimeStep = 1000 / 60;
  generator = new RandomNameGenerator();
  pickupManager: PickupManager;

  async execute(payload: this["payload"]) {
    this.tilemapManager = payload.tilemapManager;
    this.pickupManager = new PickupManager(this.tilemapManager);

    this.room.clock.setInterval(async () => {
      const bots = Array.from(this.room.state.players.values()).filter(
        (player) => player.type === "bot"
      );
      const humans = Array.from(this.room.state.players.values()).filter(
        (player) => player.type === "human"
      );
      const totalPlayers = humans.length + bots.length;

      // If maxBots is 0, remove all bots and prevent adding new ones
      if (this.room.maxBots === 0) {
        if (bots.length > 0) {
          bots.forEach((bot) => this.room.state.players.delete(bot.sessionId));
        }
        return;
      }

      // If we don't have enough players, add bots
      if (totalPlayers < this.room.minPlayers) {
        const botsToAdd = Math.min(
          this.room.maxBots,
          this.room.minPlayers - totalPlayers
        );

        for (let i = 0; i < botsToAdd; i++) {
          await this.createPlayer(null, null, "bot");
        }
      }

      // If there are too many bots, remove the extra ones
      if (
        humans.length >= this.room.minPlayers ||
        bots.length > this.room.maxBots
      ) {
        const botsToRemove = Math.max(
          0,
          bots.length - Math.max(0, this.room.maxBots - humans.length)
        );

        for (let i = 0; i < botsToRemove; i++) {
          const botToRemove = bots[i];
          if (botToRemove) {
            this.room.state.players.delete(botToRemove.sessionId);
          }
        }
      }
    }, 5000);

    this.spawnPickups();

    for (let i = 0; i < payload.maxBots; i++) {
      await this.createPlayer(null, null, "bot");
    }

    this.room.onMessage("chat", (client, { message }) => {
      const player = this.room.state.players.get(client.sessionId);

      if (player && message?.trim() !== "") {
        if (player.lastChatted && Date.now() - player.lastChatted < 2000) {
          return;
        }

        const chatMessage = new ChatMessage();
        chatMessage.playerName = player.name || "Anonymous";
        chatMessage.message = profanity.censor(message.trim().slice(0, 128));
        chatMessage.timestamp = Date.now();

        // Add the chat message to the state
        this.room.state.chat.push(chatMessage);

        // Broadcast the chat message to all clients
        this.room.broadcast("chat", {
          playerName: chatMessage.playerName,
          message: chatMessage.message,
          timestamp: chatMessage.timestamp,
        });

        player.lastChatted = Date.now();
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
      "respawn",
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
            player.name = profanity.censor(playerName.trim().slice(0, 20));
          } else {
            player.name =
              player.name || this.generator.generateRandomName().name; // Fallback to a default name if playerName is not provided
          }
          console.log(`${client.sessionId} is respawning to room ${roomName}.`);
          if (skin && !player.team) {
            player.skin = skin;
          }

          if (player.canRespawn()) {
            await player.respawn(this.tilemapManager);

            this.room.broadcast("client-respawned", {
              sessionId: client.sessionId,
            });
          }

          this.onPlayerRespawn(player);
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

  async createPlayer(
    client: Client,
    skin: string,
    type: "human" | "bot" = "human"
  ) {
    const player = new Player();

    player.type = type;

    if (!skin) {
      player.skin = this.assignRandomSkin();
    } else {
      player.skin = skin;
    }

    if (type === "bot") {
      player.sessionId = `bot_${nanoid()}`; // Assign unique ID for bots
      this.room.state.players.set(player.sessionId, player);

      player.name = this.generator.generateRandomName().name;
      player.isDead = false;
      player.isReady = true;
    } else {
      player.sessionId = client.sessionId;
      this.room.state.players.set(client.sessionId, player);
    }

    // All game types to modify player before spawn, ie: add a team.
    this.onCreatePlayer(player);

    await player.assignSpawn(this.tilemapManager);

    return player;
  }

  onCreatePlayer(player: Player) {}

  onPlayerRespawn(player: Player) {}

  assignRandomSkin(): string {
    const availableSkins = ["playersa", "playersb", "playersc", "playersd"];

    return availableSkins[Math.floor(Math.random() * availableSkins.length)];
  }

  spawnPickups() {
    this.pickupManager.spawnRandomPickups(this.room);
  }
}
