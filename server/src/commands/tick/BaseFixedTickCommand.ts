import { Command } from "@colyseus/command";
import { PickupFactory } from "../../pickups/PickupFactory";
import type { InputData } from "../../interfaces/InputData";
import { Bullet } from "../../schemas/Bullet";
import type { Player } from "../../schemas/Player";
import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import { respawnPlayer, smoothAngle } from "../../lib/player.lib";
import { nanoid } from "nanoid";
import { generateBotInput, getNearestPlayer } from "../../lib/bots.lib";
import type { BaseRoom } from "../../rooms/BaseRoom";
import type { BaseRoomState } from "../../states/BaseRoomState";

// Updates per tick, base for all rooms.
export class BaseTickCommand<
  TRoom extends BaseRoom<TState>, // Room type that extends BaseRoom with TState
  TState extends BaseRoomState // The schema (state) type for the room
  // The schema (state) type for the room
> extends Command<
  TRoom,
  { tilemapManager: TilemapManager; collisionSystem: Collision }
> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;

  execute(payload: this["payload"]) {
    this.tilemapManager = payload.tilemapManager;
    this.collisionSystem = payload.collisionSystem;

    this.room.state.players.forEach((player) => {
      if (player.isDead) {
        player.isMoving = false;
        return;
      }

      let input: InputData;
      let isCurrentlyMoving = false;
      let isColliding = false;

      if (player.type === "bot") {
        // Generate bot input dynamically
        const target = getNearestPlayer(player, this.room.state.players); // Get nearest player (function below)
        input = generateBotInput(player, target); // Function to create bot input
      } else {
        // Human player input from the queue
        input = player.inputQueue.shift();
      }

      if (!input) return;

      const isReloading = input.r || input.pointer?.reload;

      const velocity = isReloading
        ? player.reloadPlayerSpeed
        : player.speed || player.defaultSpeed;

      const angle = player.rotation;

      let newX = player.x;
      let newY = player.y;

      // Reload logic
      if (
        player.enabled &&
        isReloading &&
        player.ammo < player.maxAmmo &&
        (!player.lastReloadTime ||
          Date.now() - player.lastReloadTime >= player.reloadDelay)
      ) {
        player.ammo += player.reloadAmount;
        player.ammo = Math.min(player.ammo, player.maxAmmo);
        player.lastReloadTime = Date.now();
      }

      // Movement logic
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

      if (input.left) {
        newX += Math.sin(angle) * velocity * 0.5;
        newY -= Math.cos(angle) * velocity * 0.5;
        isCurrentlyMoving = true;
      } else if (input.right) {
        newX -= Math.sin(angle) * velocity * 0.5;
        newY += Math.cos(angle) * velocity * 0.5;
        isCurrentlyMoving = true;
      }

      if (input.pointer) {
        const dx = input.pointer.x - player.x;
        const dy = input.pointer.y - player.y;

        // Calculate the distance between the pointer and the player
        const distance = Math.sqrt(dx * dx + dy * dy);

        const targetAngle = Math.atan2(dy, dx);

        player.rotation = smoothAngle(player.rotation, targetAngle, 0.1);

        if (distance <= player.playerRadius) {
          newX = player.x;
          newY = player.y;
          isCurrentlyMoving = false;
        }
      }

      // Handle shooting
      if (!isReloading && (input.shoot || input.pointer?.shoot)) {
        this.fireBullet(player, input.pointer);
      }

      // Check for collisions with pickups
      let isBlockedByPickup = false;
      this.room.state.pickups.forEach((pickupSource) => {
        const pickup = PickupFactory.createPickup(
          pickupSource.type,
          pickupSource.x,
          pickupSource.y
        );

        if (!pickup) {
          return;
        }

        const isCollidingWithPickup = this.collisionSystem.detectCollision(
          {
            type: pickupSource.colissionShape || "circle",
            x: pickupSource.x + (pickupSource.colissionOffsetX || 0),
            y: pickupSource.y + (pickupSource.colissionOffsetY || 0),
            width: pickupSource.colissionWidth,
            height: pickupSource.colissionHeight,
            radius: pickupSource.radius,
            rotation: pickupSource.rotation,
          },
          {
            type: "circle", // Shape type
            x: newX,
            y: newY,
            radius: player.playerRadius,
          }
        );

        if (isCollidingWithPickup) {
          isColliding = true;
          pickup.onPlayerCollision(player); // Trigger collision effect

          if (pickup.blocking) {
            isBlockedByPickup = true; // Prevent movement if pickup blocks
          }

          if (pickup.playAudioOnPickup && pickup.audioKey) {
            this.room.broadcast("play-sound", {
              item: pickup,
              key: pickup.audioKey,
            });
          }

          // Handle pickup destruction and redeployment
          if (pickup.destroyOnCollision) {
            const pickupIndex = this.room.state.pickups.indexOf(pickupSource);
            this.room.state.pickups.splice(pickupIndex, 1); // Remove the pickup

            if (pickup.isRedeployable) {
              setTimeout(() => {
                const redeployedPickup = PickupFactory.createPickup(
                  pickup.type,
                  pickup.x,
                  pickup.y
                );
                if (redeployedPickup) {
                  redeployedPickup.id = nanoid();
                  redeployedPickup.isRedeployable = pickup.isRedeployable;
                  redeployedPickup.redeployTimeout = pickup.redeployTimeout;

                  this.room.state.pickups.push(redeployedPickup); // Add it back
                }
              }, pickup.redeployTimeout);
            }
          }
        }
      });

      if (!isColliding) {
        const isCollidingInTilemap = this.tilemapManager.isColliding(
          newX,
          newY,
          player.playerSize,
          player.playerSize
        );

        if (isCollidingInTilemap) {
          isColliding = true;
        }
      }

      if (!isColliding) {
        this.room.state.players.forEach((otherPlayer) => {
          if (player === otherPlayer || otherPlayer.isDead || player.isDead) {
            return;
          }
      
          // Calculate the distance between the two players
          const dx = player.x - otherPlayer.x;
          const dy = player.y - otherPlayer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
      
          // Check for collision (distance < combined hit radius)
          if (distance < player.hitRadius + otherPlayer.hitRadius) {
            const overlap = player.hitRadius + otherPlayer.hitRadius - distance;
      
            // Normalize the collision vector (dx, dy)
            const nx = dx / distance || 0;
            const ny = dy / distance || 0;
      
            // Calculate the proposed new position
            const proposedX = player.x + nx * overlap * 2;
            const proposedY = player.y + ny * overlap * 2;
      
            // Check if the new position collides with the tilemap
            const isCollidingInTilemap = this.tilemapManager.isColliding(
              proposedX,
              proposedY,
              player.playerSize,
              player.playerSize
            );
      
            if (!isCollidingInTilemap) {
              // Update player position if valid
              player.x = proposedX;
              player.y = proposedY;
      
              // Optionally, adjust the other player's position
              const otherProposedX = otherPlayer.x - nx * overlap * 2;
              const otherProposedY = otherPlayer.y - ny * overlap * 2;
      
              const otherPlayerColliding = this.tilemapManager.isColliding(
                otherProposedX,
                otherProposedY,
                otherPlayer.playerSize,
                otherPlayer.playerSize
              );
      
              if (!otherPlayerColliding) {
                otherPlayer.x = otherProposedX;
                otherPlayer.y = otherProposedY;
              }
            }
      
            isColliding = true; // Collision occurred
          }
        });
      }

      if (!isColliding) {
        this.room.state.players.forEach((otherPlayer) => {
          if (player === otherPlayer || otherPlayer.isDead || player.isDead) {
            return;
          }

          // Calculate the distance between the two players
          const dx = player.x - otherPlayer.x;
          const dy = player.y - otherPlayer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Check for collision (distance < combined hit radius)
          if (distance < player.hitRadius + otherPlayer.hitRadius) {
            const overlap = player.hitRadius + otherPlayer.hitRadius - distance;

            // Normalize the collision vector (dx, dy)
            const nx = dx / distance || 0;
            const ny = dy / distance || 0;

            // Push the moving player out of collision by adjusting the position
            player.x += nx * overlap * 2; // Adjust based on direction
            player.y += ny * overlap * 2;

            // Optionally, push the other player too (for equal collision response)
            otherPlayer.x -= nx * overlap * 0.5;
            otherPlayer.y -= ny * overlap * 0.5;

            isColliding = true; // Flag that a collision occurred
          }
        });
      }

      if (isBlockedByPickup || isColliding || !player.enabled) {
        isCurrentlyMoving = false;
      } else {
        player.x = newX;
        player.y = newY;
      }

      player.tick = input.tick;
      player.isMoving = isCurrentlyMoving;
    });

    this.updateBullets();
  }

  fireBullet(player: Player, pointer: any) {
    if (player.isProtected) {
      player.isProtected = false;
    }

    if (!player.enabled) {
      return;
    }

    const now = Date.now();
    const cooldown = player.bulletCooldown || 100; // Default cooldown to 100ms if undefined

    if (
      now - player.lastBulletTime < cooldown ||
      (!player.ammoUnlimited && player.ammo <= 0)
    ) {
      return; // Skip firing if cooldown hasn't elapsed
    }

    player.lastBulletTime = now; // Update the last bullet fired time

    const bulletFireRate = player.bulletFireRate || 0; // Default to 1 bullet if undefined
    const bulletFireDelay = player.bulletFireDelay || 100; // Delay between bullets in milliseconds

    for (let i = 0; i < bulletFireRate; i++) {
      setTimeout(() => {
        // Calculate the direction vector to the pointer
        const dx = pointer.x - player.x;
        const dy = pointer.y - player.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);

        // Normalize the direction vector
        const directionX = dx / magnitude;
        const directionY = dy / magnitude;

        // Create a new bullet
        const bullet = new Bullet();
        bullet.id = nanoid();
        bullet.x = player.x + directionX * 15; // Offset from the player's position
        bullet.y = player.y + directionY * 15;
        bullet.dx = directionX * player.bulletSpeed;
        bullet.dy = directionY * player.bulletSpeed;
        bullet.ownerId = player.sessionId;

        if (!player.ammoUnlimited) {
          player.ammo -= 1;
        }

        this.room.state.bullets.push(bullet);
      }, i * bulletFireDelay); // Delay each bullet by bulletFireDelay * i
    }
  }

  updateBullets() {
    const mapBounds = {
      width: this.room.state.mapWidth,
      height: this.room.state.mapHeight,
    };

    const bulletsToRemove: Bullet[] = [];
    const bulletsChecked: Set<string> = new Set(); // Track already checked bullet pairs

    this.room.state.bullets.forEach((bullet, index) => {
      // Update bullet position
      bullet.x += bullet.dx;
      bullet.y += bullet.dy;
      bullet.lifetime -= this.room.fixedTimeStep;

      // Check if the bullet has expired
      if (bullet.lifetime <= 0) {
        bullet.colissionType = "timeout";
        this.room.broadcast("bullet-destroyed", { bullet });

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
        bullet.colissionType = "colissionLayer";

        this.room.broadcast("bullet-destroyed", { bullet });
        bulletsToRemove.push(bullet);
        return;
      }

      this.room.state.pickups.forEach((pickupSource, index) => {
        const pickup = PickupFactory.createPickup(
          pickupSource.type,
          pickupSource.x,
          pickupSource.y,
          pickupSource
        );

        if (!pickup) {
          return;
        }

        const isColliding = this.collisionSystem.detectCollision(
          {
            type: pickupSource.colissionShape || "circle",
            x: pickupSource.x + (pickupSource.colissionOffsetX || 0),
            y: pickupSource.y + (pickupSource.colissionOffsetY || 0),
            width: pickupSource.colissionWidth,
            height: pickupSource.colissionHeight,
            radius: pickupSource.radius,
            rotation: pickupSource.rotation,
          },
          {
            type: "circle", // Shape type
            x: bullet.x,
            y: bullet.y,
            radius: bulletSize,
          }
        );

        if (isColliding) {
          const onBulletCollision = pickup.onBulletCollision();
          // Update main pickup with new properties after colission

          // not ideal for just 1 setting...
          pickupSource.health = pickup.health;

          if (onBulletCollision) {
            this.room.state.pickups.splice(
              this.room.state.pickups.indexOf(pickupSource),
              1
            ); // Remove pickup
          }

          if (pickup.destroyBulletOnCollision) {
            bullet.colissionType = "pickup";
            // to-do: get where it intersected with the item better!
            // bullet.x = pickupSource.x;
            // bullet.y = pickupSource.y;
            this.room.broadcast("bullet-destroyed", {
              bullet,
              pickup: pickupSource,
            });

            bulletsToRemove.push(bullet);
          }
          return;
        }
      });

      // Bullet vs Bullet Collision Detection
      this.room.state.bullets.forEach((otherBullet) => {
        if (
          bullet === otherBullet ||
          bulletsChecked.has(`${bullet.id}-${otherBullet.id}`)
        ) {
          return;
        }

        const dx = bullet.x - otherBullet.x;
        const dy = bullet.y - otherBullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < bulletSize) {
          bullet.colissionType = "bullet";
          otherBullet.colissionType = "bullet";

          this.room.broadcast("bullet-destroyed", {
            bullet,
            collidedWith: otherBullet,
            colissionType: "bullet",
          });

          bulletsToRemove.push(bullet, otherBullet);

          // Mark this pair as checked
          bulletsChecked.add(`${bullet.id}-${otherBullet.id}`);
          bulletsChecked.add(`${otherBullet.id}-${bullet.id}`);
          return;
        }
      });

      // Check collisions with players
      for (const [sessionId, player] of this.room.state.players.entries()) {
        if (player.isDead) {
          continue; // Skip dead players
        }

        if (bullet.ownerId !== sessionId) {
          const dx = bullet.x - player.x;
          const dy = bullet.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < player.hitRadius) {
            const shooter = this.room.state.players.get(bullet.ownerId);
            if (!shooter) {
              return;
            }

            bullet.colissionType = "player";

            this.room.broadcast("bullet-destroyed", {
              bullet,
              player,
              killer: shooter,
            });

            if (!player.isProtected) {
              player.health -= shooter.bulletDamage;
            }

            // Handle player death
            if (player.health <= 0) {
              this.onPlayerDeath(sessionId, player, shooter);
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
        bullet.colissionType = "outofbounds";
        this.room.broadcast("bullet-destroyed", { bullet });

        bulletsToRemove.push(bullet);
      }
    });

    // Remove bullets from ArraySchema
    bulletsToRemove.forEach((bullet) => {
      const index = this.room.state.bullets.indexOf(bullet);
      if (index !== -1) {
        this.room.state.bullets.splice(index, 1);
      }
    });
  }

  onPlayerDeath(sessionId: string, player: Player, shooter: Player) {
    player.lastKilledAt = Date.now();

    player.isDead = true;
    player.deaths += 1;

    // Increment killer's kills count
    shooter.kills += 1;

    this.room.broadcast("player-death", {
      sessionId,
      player,
      killer: shooter,
      respawnDelay: player.respawnDelay,
    });

    if (player.type === "bot") {
      setTimeout(async () => {
        await respawnPlayer(player, this.tilemapManager);
      }, player.respawnDelay * 1000);
    }
  }
}
