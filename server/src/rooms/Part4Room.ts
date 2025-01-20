import type { Client } from "colyseus";
import { Room } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

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
  @type("string") skin = "playersb_01"; // Default skin

  lastBulletTime = 0; // Track the last time a bullet was fired
  inputQueue: InputData[] = [];
}

export class MyRoomState extends Schema {
  @type("number") mapWidth = 800;
  @type("number") mapHeight = 600;

  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Bullet]) bullets = new ArraySchema<Bullet>();
}

export class Part4Room extends Room<MyRoomState> {
  fixedTimeStep = 1000 / 60;
  bulletSpeed = 5;

  onCreate(options: any) {
    this.setState(new MyRoomState());

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

    this.state.players.forEach((player) => {
      if (player.isDead) return; // Skip dead players

      let input: InputData;

      while ((input = player.inputQueue.shift())) {
        if (input.left) {
          player.rotation -= 0.05; // Rotate left
        }
        if (input.right) {
          player.rotation += 0.05; // Rotate right
        }

        const angle = player.rotation;

        if (input.up) {
          player.x += Math.cos(angle) * velocity;
          player.y += Math.sin(angle) * velocity;
        }

        if (input.down) {
          player.x -= Math.cos(angle) * velocity * 0.5;
          player.y -= Math.sin(angle) * velocity * 0.5;
        }

        if (input.shoot) {
          this.fireBullet(player);
        }

        player.tick = input.tick;
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

    // Filter bullets to keep only those still valid
    this.state.bullets = this.state.bullets.filter((bullet) => {
      bullet.x += bullet.dx;
      bullet.y += bullet.dy;
      bullet.lifetime -= this.fixedTimeStep;

      if (bullet.lifetime <= 0) {
        return false; // Remove expired bullets
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

            // Remove the bullet immediately after collision
            if (player.health <= 0) {
              console.log(`Player ${sessionId} was killed.`);
              this.broadcast("player-death", { sessionId }); // Emit death event

              player.isDead = true;
              player.deaths += 1;

              // Increment the killer's kills count
              const killer = this.state.players.get(bullet.ownerId);
              if (killer) {
                killer.kills += 1;
                console.log(
                  `Player ${bullet.ownerId} now has ${killer.kills} kills.`
                );
              }
            }

            return false; // Remove the bullet
          }
        }
      }

      // Remove bullets out of bounds
      return (
        bullet.x >= 0 &&
        bullet.x <= mapBounds.width &&
        bullet.y >= 0 &&
        bullet.y <= mapBounds.height
      );
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
    const spawnBuffer = 50;
    const maxAttempts = 100; // Limit the number of spawn attempts
    let attempts = 0;
    let isValidSpawn = false;

    while (attempts < maxAttempts) {
      attempts++;

      // Generate a random position
      player.x = Math.random() * this.state.mapWidth;
      player.y = Math.random() * this.state.mapHeight;

      // Check if the position is valid
      isValidSpawn = Array.from(this.state.players.values()).every(
        (otherPlayer) => {
          // Skip checking against the same player
          if (otherPlayer === player || otherPlayer.isDead) return true;

          const dx = player.x - otherPlayer.x;
          const dy = player.y - otherPlayer.y;
          return Math.sqrt(dx * dx + dy * dy) > spawnBuffer;
        }
      );

      // Break the loop if a valid position is found
      if (isValidSpawn) break;
    }

    if (!isValidSpawn) {
      console.warn(
        "Could not find a valid spawn position within the buffer. Placing player randomly."
      );
      // Use the last generated random position
    }
  }

  private assignRandomSkin(): string {
    const availableSkins = ["playersa_01", "playersb_01", "playersc_01"];
    return availableSkins[Math.floor(Math.random() * availableSkins.length)];
  }
}
