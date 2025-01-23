import { Command } from "@colyseus/command";
import type { FreeForAllRoom } from "../rooms/FreeForAllRoom";
import { PickupFactory } from "../pickups/PickupFactory";
import { nanoid } from "nanoid";
import type { InputData } from "../interfaces/InputData";
import { Bullet } from "../schemas/Bullet";
import type { Player } from "../schemas/Player";
import type { TilemapManager } from "../TilemapManager";
import type { Collision } from "../classes/Collision";

export class FixedTickCommand extends Command<
  FreeForAllRoom,
  { tilemapManager: TilemapManager; collisionSystem: Collision }
> {
  private tilemapManager: TilemapManager;
  private collisionSystem: Collision;

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

      while ((input = player.inputQueue.shift())) {
        const isReloading = input.r || input.pointer.reload;

        const velocity = isReloading
          ? player.reloadPlayerSpeed
          : player.speed || player.defaultSpeed;
        const angle = player.rotation;
        let newX = player.x;
        let newY = player.y;

        if (
          isReloading &&
          (!player.lastReloadTime ||
            Date.now() - player.lastReloadTime >= player.reloadDelay)
        ) {
          player.ammo += player.reloadAmount; // Add ammo
          player.lastReloadTime = Date.now(); // Update last reload time
        }

        // Check for movement input

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
          // Move perpendicular to the rotation angle (left direction)
          newX += Math.sin(player.rotation) * velocity * 0.3;
          newY -= Math.cos(player.rotation) * velocity * 0.3;
          isCurrentlyMoving = true;
        } else if (input.right) {
          // Move perpendicular to the rotation angle (right direction)
          newX -= Math.sin(player.rotation) * velocity * 0.3;
          newY += Math.cos(player.rotation) * velocity * 0.3;
          isCurrentlyMoving = true;
        }

        if (input.pointer) {
          // Calculate the distance between the pointer and the player
          const dx = input.pointer.x - player.x;
          const dy = input.pointer.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Check if the pointer is outside the player's radius
          if (distance > player.playerSize * 1.5) {
            const smoothingFactor = 0.1; // Adjust for slower or faster smoothing (0.1 is smooth, closer to 1 is faster)

            const targetAngle = Math.atan2(dy, dx);

            // Smoothly interpolate the player's rotation towards the target angle
            player.rotation += this.smoothAngle(
              player.rotation,
              targetAngle,
              smoothingFactor
            );
          }
        }
        // Handle shooting
        if (!isReloading && (input.shoot || input.pointer.shoot)) {
          this.fireBullet(player);
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
              x: newX,
              y: newY,
              radius: player.playerRadius,
            }
          );

          if (isColliding) {
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

        const isColliding = this.tilemapManager.isColliding(
          newX,
          newY,
          player.playerSize,
          player.playerSize
        );

        if (isBlockedByPickup || isColliding) {
          isCurrentlyMoving = false;
        } else {
          player.x = newX;
          player.y = newY;
        }

        // Update player state
        player.tick = input.tick;
        player.isMoving = isCurrentlyMoving;
      }
    });

    this.updateBullets();
  }

  fireBullet(player: Player) {
    const now = Date.now();
    const cooldown = player.bulletCooldown || 100; // Default cooldown to 100ms if undefined

    if (
      now - player.lastBulletTime < cooldown ||
      (!player.ammoUnlimited && player.ammo <= 0)
    ) {
      return; // Skip firing if cooldown hasn't elapsed
    }

    player.lastBulletTime = now; // Update the last bullet fired time

    const bulletFireRate = player.bulletFireRate || 1; // Default to 1 bullet if undefined
    const bulletFireDelay = player.bulletFireDelay || 100; // Delay between bullets in milliseconds

    for (let i = 0; i < bulletFireRate; i++) {
      setTimeout(() => {
        const angle = player.rotation;

        const bullet = new Bullet();
        bullet.x = player.x + Math.cos(angle) * 15; // Offset from the player's position
        bullet.y = player.y + Math.sin(angle) * 15;
        bullet.dx = Math.cos(angle) * player.bulletSpeed;
        bullet.dy = Math.sin(angle) * player.bulletSpeed;

        const client = this.room.clients.find(
          (c) => this.room.state.players.get(c.sessionId) === player
        );

        if (client) {
          bullet.ownerId = client.sessionId;
        } else {
          console.warn(
            `No client found for player at position (${player.x}, ${player.y})`
          );
          return; // Do not create the bullet if we can't find the client
        }

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

            player.health -= shooter.bulletDamage;

            // Handle player death
            if (player.health <= 0) {
              player.isDead = true;
              player.deaths += 1;

              // Increment killer's kills count
              shooter.kills += 1;

              this.room.broadcast("player-death", {
                sessionId,
                player,
                killer: shooter,
              });
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

  private smoothAngle(current: number, target: number, factor: number): number {
    let delta = target - current;

    // Normalize delta to the range [-PI, PI]
    delta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;

    // Apply smoothing
    return delta * factor;
  }
}
