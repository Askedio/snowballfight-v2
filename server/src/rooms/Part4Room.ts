import type { Client } from "colyseus";
import { Room } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { TilemapManager } from "../TilemapManager";
import { Pickup } from "../Pickup";
import { nanoid } from "nanoid";
import { PickupFactory } from "../PickupFactory";
import { RandomNameGenerator } from "../RandomNameGenerator";
import { Player } from "../schemas/Player";
import { Bullet } from "../schemas/Bullet";
import { ChatMessage } from "../schemas/ChatMessage";
import type { InputData } from "../interfaces/InputData";

export class MyRoomState extends Schema {
  @type("number") mapWidth = 2240;
  @type("number") mapHeight = 1600;

  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Bullet]) bullets = new ArraySchema<Bullet>();
  @type([Pickup]) pickups = new ArraySchema<Pickup>();
  @type([ChatMessage]) chat = new ArraySchema<ChatMessage>();
}

export class Part4Room extends Room<MyRoomState> {
  LOBBY_CHANNEL = "default_room";

  customRoomName: string;

  fixedTimeStep = 1000 / 60;
  private tilemapManager: TilemapManager;

  async onCreate(options: any) {
    this.setState(new MyRoomState());

    this.maxClients = 20; // Adjust the number as needed

    const mapFilePath = "../client/static/assets/maps/winter/map.json"; // Update with the correct path
    const collisionLayerName = "Colissins";
    const spawnLayerName = "spawns";
    this.tilemapManager = new TilemapManager(
      mapFilePath,
      collisionLayerName,
      spawnLayerName
    );

    this.spawnPickups();

    this.onMessage("chat", (client, { message }) => {
      const player = this.state.players.get(client.sessionId);

      if (player && message?.trim() !== "") {
        const chatMessage = new ChatMessage();
        chatMessage.playerName = player.name || "Anonymous";
        chatMessage.message = message;
        chatMessage.timestamp = Date.now();

        // Add the chat message to the state
        this.state.chat.push(chatMessage);

        // Broadcast the chat message to all clients
        this.broadcast("chat", {
          playerName: chatMessage.playerName,
          message: chatMessage.message,
          timestamp: chatMessage.timestamp,
        });
      }
    });

    this.onMessage("input", (client, input: InputData) => {
      const player = this.state.players.get(client.sessionId);
      if (player && !player.isDead) {
        player.inputQueue.push(input);
      }
    });

    // Rejoin message handler
    this.onMessage("rejoin", (client, { playerName, roomName }) => {
      // Check if the player exists in the room state
      let player = this.state.players.get(client.sessionId);

      if (!player) {
        // If the player does not exist, create one
        console.log(
          `${client.sessionId} creating player state in room ${roomName}.`
        );
        this.createPlayer(client);
        player = this.state.players.get(client.sessionId); // Re-fetch the player
      }

      if (player) {
        if (player.isDead) {
          console.log(`${client.sessionId} is respawning to room ${roomName}.`);
          player.health = 100; // Restore health
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
    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });
  }

  createPlayer(client: Client) {
    const player = new Player();

    // Assign a new random position
    this.assignRandomPosition(player);

    // Respawn player with full health
    player.health = 100;
    player.isDead = false;
    player.skin = this.assignRandomSkin();

    this.state.players.set(client.sessionId, player);
  }

  fixedTick(timeStep: number) {
    const playerSize = 32; // Adjust based on your player sprite size

    this.state.players.forEach((player) => {
      if (player.isDead) {
        player.isMoving = false;
        return;
      }

      this.state.players.forEach((player) => {
        if (player.isDead) return;

        this.state.pickups.forEach((pickup) => {
          const realPickup = PickupFactory.createPickup(
            pickup.type,
            pickup.x,
            pickup.y,
            pickup.asset
          );

          if (!realPickup) return;

          const dx = pickup.x - player.x;
          const dy = pickup.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const pickupRadius = 16; // Adjust as needed for the pickup size
          const playerRadius = 16; // Adjust as needed for the player size

          if (distance < pickupRadius + playerRadius) {
            realPickup.onPlayerCollision(player);

            if (realPickup.destroyOnCollision) {
              const pickupIndex = this.state.pickups.indexOf(pickup);
              this.state.pickups.splice(pickupIndex, 1); // Remove the pickup

              if (realPickup.isRedeployable) {
                setTimeout(() => {
                  // Re-create the pickup in the same position
                  const redeployedPickup = PickupFactory.createPickup(
                    realPickup.type,
                    realPickup.x,
                    realPickup.y,
                    realPickup.asset
                  );
                  if (redeployedPickup) {
                    redeployedPickup.id = nanoid(); // Assign a new ID
                    redeployedPickup.isRedeployable = realPickup.isRedeployable;
                    redeployedPickup.redeployTimeout =
                      realPickup.redeployTimeout;

                    this.state.pickups.push(redeployedPickup); // Add it back to the game state
                  }
                }, realPickup.redeployTimeout);
              }
            }
          }
        });
      });

      let input: InputData;
      let isCurrentlyMoving = false;

      while ((input = player.inputQueue.shift())) {
        const velocity = player.speed || 2;

        const angle = player.rotation;
        let newX = player.x;
        let newY = player.y;

        if (input.left) {
          player.rotation -= 0.05;
          isCurrentlyMoving = true;
        }
        if (input.right) {
          player.rotation += 0.05;
          isCurrentlyMoving = true;
        }
        if (input.up) {
          newX += Math.cos(angle) * velocity;
          newY += Math.sin(angle) * velocity;
          isCurrentlyMoving = true;
        }
        if (input.down) {
          newX -= Math.cos(angle) * velocity * 0.5;
          newY -= Math.sin(angle) * velocity * 0.5;
          isCurrentlyMoving = true;
        }

        // Use TilemapManager to check for collisions
        if (
          !this.tilemapManager.isColliding(newX, newY, playerSize, playerSize)
        ) {
          player.x = newX;
          player.y = newY;
        }

        if (input.shoot) {
          this.fireBullet(player);
        }

        player.tick = input.tick;
        player.isMoving = isCurrentlyMoving;
      }
    });

    this.updateBullets();
  }

  fireBullet(player: Player) {
    const now = Date.now();
    const cooldown = player.bulletCooldown; // Bullet cooldown in milliseconds

    if (now - player.lastBulletTime < cooldown) {
      return; // Skip firing if cooldown hasn't elapsed
    }

    player.lastBulletTime = now; // Update the last bullet fired time

    const angle = player.rotation;

    const bullet = new Bullet();
    bullet.x = player.x + Math.cos(angle) * 15; // Offset from the player's position
    bullet.y = player.y + Math.sin(angle) * 15;
    bullet.dx = Math.cos(angle) * player.bulletSpeed;
    bullet.dy = Math.sin(angle) * player.bulletSpeed;
    const client = this.clients.find(
      (c) => this.state.players.get(c.sessionId) === player
    );
    if (client) {
      bullet.ownerId = client.sessionId;
    } else {
      console.warn(
        `No client found for player at position (${player.x}, ${player.y})`
      );
      return; // Do not create the bullet if we can't find the client
    }

    this.state.bullets.push(bullet);
  }

  updateBullets() {
    const mapBounds = {
      width: this.state.mapWidth,
      height: this.state.mapHeight,
    };

    const bulletsToRemove: Bullet[] = [];

    this.state.bullets.forEach((bullet, index) => {
      // Update bullet position
      bullet.x += bullet.dx;
      bullet.y += bullet.dy;
      bullet.lifetime -= this.fixedTimeStep;

      // Check if the bullet has expired
      if (bullet.lifetime <= 0) {
        bulletsToRemove.push(bullet);
        return;
      }

      // Check if the bullet hits the collision layer
      const bulletSize = 5; // Adjust if bullets have a specific size
      if (
        this.tilemapManager.isColliding(
          bullet.x - bulletSize / 2,
          bullet.y - bulletSize / 2,
          bulletSize,
          bulletSize
        )
      ) {
        bulletsToRemove.push(bullet);
        return;
      }

      this.state.pickups.forEach((pickup) => {
        const realPickup = PickupFactory.createPickup(
          pickup.type,
          pickup.x,
          pickup.y,
          pickup.asset
        );

        if (!realPickup) return;

        const dx = pickup.x - bullet.x;
        const dy = pickup.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 16 && realPickup.onBulletCollision()) {
          this.state.pickups.splice(this.state.pickups.indexOf(pickup), 1); // Remove pickup
          bulletsToRemove.push(bullet);
          return;
        }
      });

      // Check collisions with players
      for (const [sessionId, player] of this.state.players.entries()) {
        if (player.isDead) continue; // Skip dead players

        if (bullet.ownerId !== sessionId) {
          const dx = bullet.x - player.x;
          const dy = bullet.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const hitRadius = 15; // Adjust hit radius based on player size
          if (distance < hitRadius) {
            player.health -= 20;

            // Handle player death
            if (player.health <= 0) {
              player.isDead = true;
              player.deaths += 1;

              // Increment killer's kills count
              const killer = this.state.players.get(bullet.ownerId);
              if (killer) {
                killer.kills += 1;
                console.log(
                  `Player ${bullet.ownerId} now has ${killer.kills} kills.`
                );
              }

              console.log(`Player ${sessionId} was killed.`);
              this.broadcast("player-death", { sessionId, killer }); // Emit death event
            }

            bulletsToRemove.push(bullet);
            return;
          }
        }
      }

      // Check if the bullet is out of bounds
      if (
        bullet.x < 0 ||
        bullet.x > mapBounds.width ||
        bullet.y < 0 ||
        bullet.y > mapBounds.height
      ) {
        bulletsToRemove.push(bullet);
      }
    });

    // Remove bullets from ArraySchema
    bulletsToRemove.forEach((bullet) => {
      const index = this.state.bullets.indexOf(bullet);
      if (index !== -1) {
        this.state.bullets.splice(index, 1);
      }
    });
  }

  async onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    return;
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");

    //this.state.players.get(client.sessionId).connected = false;

    //this.state.players.get(client.sessionId).connected = false;

    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    this.presence.srem(this.LOBBY_CHANNEL, this.roomId);
    console.log("room", this.roomId, "disposing...");
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
      const randomType =
        itemTypes[Math.floor(Math.random() * itemTypes.length)];

      const pickup = PickupFactory.createPickup(
        randomType,
        tile.x,
        tile.y,
        assets[randomType]
      );

      if (!pickup) return;

      pickup.id = nanoid(); // Generate unique ID
      this.state.pickups.push(pickup);
    });
  }
}
