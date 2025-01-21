import type { Client } from "colyseus";
import { Room } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { TilemapManager } from "../TilemapManager";
import { Pickup } from "../Pickup";
import nanoid from "nanoid"; // Default import

export interface InputData {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  shoot: boolean;
  tick: number;
}

export class Bullet extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("number") dx: number;
  @type("number") dy: number;
  @type("number") lifetime = 2000; // Bullet lifetime in ms
  @type("string") ownerId: string;
}

export class Player extends Schema {
  @type("number") x = 400;
  @type("number") y = 300;
  @type("number") rotation = 0; // Rotation in radians
  @type("number") health = 100;
  @type("number") kills = 0;
  @type("number") deaths = 0;
  @type("number") tick: number;
  @type("boolean") isDead = false; // Track if the player is dead
  @type("string") skin = "playersa"; // Default skin
  @type("boolean") isMoving = false; // Track if the player is moving

  lastBulletTime = 0; // Track the last time a bullet was fired
  inputQueue: InputData[] = [];
}

export class MyRoomState extends Schema {
  @type("number") mapWidth = 2240;
  @type("number") mapHeight = 1600;

  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Bullet]) bullets = new ArraySchema<Bullet>();
  @type([Pickup]) pickups = new ArraySchema<Pickup>(); // Add pickups
}

export class Part4Room extends Room<MyRoomState> {
  fixedTimeStep = 1000 / 60;
  bulletSpeed = 5;
  private tilemapManager: TilemapManager;

  onCreate(options: any) {
    this.setState(new MyRoomState());

    const mapFilePath = "../client/static/assets/maps/winter/map.json"; // Update with the correct path
    const collisionLayerName = "Colissins";
    const spawnLayerName = "spawns";
    this.tilemapManager = new TilemapManager(
      mapFilePath,
      collisionLayerName,
      spawnLayerName
    );

    this.spawnPickups()

    this.onMessage("input", (client, input: InputData) => {
      const player = this.state.players.get(client.sessionId);
      if (player && !player.isDead) {
        player.inputQueue.push(input);
      }
    });

    // Rejoin message handler
    this.onMessage("rejoin", (client) => {
      const player = this.state.players.get(client.sessionId);

      if (player) {
        if (player.isDead) {
          console.log(`${client.sessionId} is respawning.`);
          player.health = 100; // Restore health
          player.isDead = false; // Mark as alive
          this.assignRandomPosition(player); // Respawn at a new position
        } else {
          console.warn(`${client.sessionId} tried to rejoin while alive.`);
        }
      } else {
        console.log(`${client.sessionId} is being added back.`);
        this.createPlayer(client);
      }
    });

    let elapsedTime = 0;
    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        //console.log(elapsedTime, ">=", this.fixedTimeStep)
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
    const velocity = 2;
    const playerSize = 32; // Adjust based on your player sprite size

    this.state.players.forEach((player) => {
      if (player.isDead) {
        player.isMoving = false;
        return;
      }

      this.state.players.forEach((player) => {
        if (player.isDead) return;
      
        this.state.pickups.forEach((pickup) => {
          const dx = pickup.x - player.x;
          const dy = pickup.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
      
          const pickupRadius = 16; // Adjust as needed for the pickup size
          const playerRadius = 16; // Adjust as needed for the player size
      
          if (distance < pickupRadius + playerRadius) {
            console.log(`Player collided with pickup: ${pickup.type}`);
      
            // Destroy the pickup on collision if the flag is set
            if (pickup.destroyOnCollision) {
              console.log(`Pickup ${pickup.type} destroyed on collision.`);
              this.state.pickups.splice(this.state.pickups.indexOf(pickup), 1); // Remove the pickup
            }
      
            // Optional: Apply pickup effects
            if (pickup.type === "treasure") {
              console.log("Treasure collected!");
              player.health += 50; // Example: Increase player health
            } else if (pickup.type === "skull") {
              console.log("Skull encountered!");
            }
          }
        });
      });
      

      let input: InputData;
      let isCurrentlyMoving = false;

      while ((input = player.inputQueue.shift())) {
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
        } else {
          console.log("Collision detected! Movement blocked.");
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
    const cooldown = 400; // Bullet cooldown in milliseconds

    if (now - player.lastBulletTime < cooldown) {
      return; // Skip firing if cooldown hasn't elapsed
    }

    player.lastBulletTime = now; // Update the last bullet fired time

    const angle = player.rotation;

    const bullet = new Bullet();
    bullet.x = player.x + Math.cos(angle) * 15; // Offset from the player's position
    bullet.y = player.y + Math.sin(angle) * 15;
    bullet.dx = Math.cos(angle) * this.bulletSpeed;
    bullet.dy = Math.sin(angle) * this.bulletSpeed;
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
        console.log("Bullet hit the collision layer.");
        bulletsToRemove.push(bullet);
        return;
      }
  
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
              console.log(`Player ${sessionId} was killed.`);
              this.broadcast("player-death", { sessionId }); // Emit death event
  
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
        console.log("Bullet out of bounds.");
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
  

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    return;
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");

    //this.state.players.get(client.sessionId).connected = false;

    try {
      if (consented) {
        this.state.players.delete(client.sessionId);
        return;
        //throw new Error("consented leave");
      }

      // allow disconnected client to reconnect into this room until 20 seconds
      await this.allowReconnection(client, 20);

      // client returned! let's re-activate it.
      this.createPlayer(client);
    } catch (e) {
      // 20 seconds expired. let's remove the client.
      this.state.players.delete(client.sessionId);
    }

    //this.state.players.delete(client.sessionId);
  }

  onDispose() {
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
      const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
      const pickup = new Pickup();
      pickup.type = randomType;
      pickup.x = tile.x;
      pickup.y = tile.y;
      pickup.asset = assets[randomType];
      pickup.health = 100; // Default health
      pickup.destroyable = true;
      pickup.destroyOnCollision = true;
      pickup.id = nanoid(); // Generate a unique ID for the pickup

      this.state.pickups.push(pickup);
    });
  }
  
}
