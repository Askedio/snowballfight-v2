import { Command } from "@colyseus/command";
import { PickupFactory } from "../../pickups/PickupFactory";
import type { InputData } from "../../interfaces/InputData";
import { Bullet } from "../../schemas/Bullet";
import type { Player } from "../../schemas/Player";
import type { TilemapManager } from "../../classes/TilemapManager";
import type { Collision } from "../../classes/Collision";
import { nanoid } from "nanoid";
import type { BaseRoom } from "../../rooms/BaseRoom";
import type { BaseRoomState } from "../../states/BaseRoomState";
import type { Pickup } from "../../schemas/Pickup";
import { BotManager } from "../../classes/BotManager";
import { SpatialPartitioningManager } from "../../classes/SpatialPartitioningManager";

// Updates per tick, base for all rooms.
export class BaseTickCommand<
  TRoom extends BaseRoom<TState>,
  TState extends BaseRoomState
> extends Command<
  TRoom,
  { tilemapManager: TilemapManager; collisionSystem: Collision }
> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;
  spatialManager = new SpatialPartitioningManager();

  execute(payload: this["payload"]) {
    this.tilemapManager = payload.tilemapManager;
    this.collisionSystem = payload.collisionSystem;

    this.room.state.players.forEach((player) => {
      if (player.isDead) {
        player.isMoving = false;
        return;
      }

      // Index bullets, pickups, and players
      this.spatialManager.updateBulletsIndex(this.room.state.bullets);
      this.spatialManager.updatePickupsIndex(this.room.state.pickups);
      this.spatialManager.updatePlayersIndex(
        Array.from(this.room.state.players.values()).filter(
          (player) => !player.isDead && !player.isProtected
        )
      );

      let input: InputData;
      let isCurrentlyMoving = false;
      let isColliding = false;

      if (player.type === "bot") {
        // Generate bot input dynamically

        //const pathfinding = new Pathfinding(
        //  this.tilemapManager,
        //  this.collisionSystem
        //);

        const botManager = new BotManager(
          this.room.state.players,
          this.room.state.pickups,
          this.spatialManager
        );
        input = botManager.generateBotInput(player);
      } else {
        // Human player input from the queue
        input = player.inputQueue.shift();
      }

      if (!input) return;

      const isReloading = input.r || input.pointer?.reload;

      const velocity = (isReloading
        ? player.reloadPlayerSpeed
        : player.speed || player.defaultSpeed) + (input.shift ? 1 : 0);

        
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

        player.rotation = player.smoothAngle(player.rotation, targetAngle, 0.1);

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
      const nearbyPickups = this.spatialManager.queryNearbyObjects(
        player.x,
        player.y,
        player.playerRadius + 50, // Query radius (adjust based on pickup interaction range)
        this.spatialManager.pickupIndex
      );

      nearbyPickups.forEach(({ pickup: pickupSource }) => {
        const pickup = PickupFactory.createPickup(
          pickupSource.type,
          pickupSource.x,
          pickupSource.y,
          pickupSource
        );

        if (!pickup) {
          return;
        }

        const isCollidingWithPickup = this.collisionSystem.detectCollision(
          {
            type: pickupSource.collisionshape || "circle",
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
          isColliding = pickup.blocking;
          pickup.onPlayerCollision(player); // Trigger collision effect

          const pickupIndex = this.room.state.pickups.indexOf(pickupSource);
          this.onPickupColission(player, pickup, pickupIndex);

          if (
            pickup.canCarry(player) &&
            !player.pickups.find((_) => _.type === pickup.type)
          ) {
            player.pickups.push(pickup);
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
                  pickup.originalX,
                  pickup.originalY,
                  pickup
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
        const nearbyPlayers = this.spatialManager.queryNearbyObjects(
          player.x,
          player.y,
          40, // Query radius
          this.spatialManager.playerIndex
        );

        nearbyPlayers.forEach(({ player: otherPlayer }) => {
          if (player === otherPlayer || otherPlayer.isDead || player.isDead || player.isProtected) {
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

      if (isColliding || !player.enabled) {
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
        const angleToPointer = Math.atan2(dy, dx); // Angle in radians

        // Normalize the direction vector
        const directionX = dx / magnitude;
        const directionY = dy / magnitude;

        // Calculate perpendicular vector (for right-hand offset)
        const perpendicularX = -directionY; // Perpendicular to shooting direction
        const perpendicularY = directionX;

        // Offset the bullet start position by ~10px to the right
        const offsetAmount = player.bulletOffset; // Adjust as needed
        const bulletStartX = player.x + perpendicularX * offsetAmount;
        const bulletStartY = player.y + perpendicularY * offsetAmount;

        // Create a new bullet
        const bullet = new Bullet();
        bullet.id = nanoid();
        bullet.x = bulletStartX + directionX * player.hitRadius; // Offset from the player's position
        bullet.y = bulletStartY + directionY * player.hitRadius;
        bullet.rotation = angleToPointer;
        bullet.dx = directionX * player.bulletSpeed;
        bullet.dy = directionY * player.bulletSpeed;
        bullet.ownerId = player.sessionId;

        if (!player.ammoUnlimited && player.ammo > 0) {
          player.ammo -= 1;
        }

        this.room.state.bullets.push(bullet);
      }, i * bulletFireDelay); // Delay each bullet by bulletFireDelay * i
    }
  }

  updateBullets() {
    const bulletsToRemove: Bullet[] = [];
    const destroyedBullets: any[] = []; // Array to store destroyed bullet data

    this.room.state.bullets.forEach((bullet) => {
      // Update bullet position
      bullet.x += bullet.dx;
      bullet.y += bullet.dy;
      bullet.lifetime -= this.room.fixedTimeStep;

      // Remove expired or out-of-bounds bullets
      if (
        bullet.lifetime <= 0 ||
        bullet.x < 0 ||
        bullet.x > this.room.state.mapWidth ||
        bullet.y < 0 ||
        bullet.y > this.room.state.mapHeight
      ) {
        destroyedBullets.push({
          bullet,
          colissionType: "timeout",
        });
        bulletsToRemove.push(bullet);
        return;
      }

      if (
        this.tilemapManager.isColliding(
          bullet.x - bullet.size / 2,
          bullet.y - bullet.size / 2,
          bullet.size,
          bullet.size
        )
      ) {
        destroyedBullets.push({
          bullet,
          colissionType: "timeout",
        });
        bulletsToRemove.push(bullet);
        return;
      }

      // Query nearby pickups
      const nearbyPickups = this.spatialManager.queryNearbyObjects(
        bullet.x,
        bullet.y,
        50, // Query radius
        this.spatialManager.pickupIndex
      );

      for (const { pickup } of nearbyPickups) {
        if (
          this.collisionSystem.detectCollision(
            {
              type: pickup.collisionshape || "circle",
              x: pickup.x + (pickup.colissionOffsetX || 0),
              y: pickup.y + (pickup.colissionOffsetY || 0),
              width: pickup.colissionWidth,
              height: pickup.colissionHeight,
              radius: pickup.radius,
              rotation: pickup.rotation,
            },
            {
              type: "circle",
              x: bullet.x,
              y: bullet.y,
              radius: bullet.size, // Bullet radius
            }
          )
        ) {
          const pickupMethod = PickupFactory.createPickup(
            pickup.type,
            pickup.originalX,
            pickup.originalY,
            pickup
          );

          if (!pickupMethod) {
            return;
          }

          const shooter = this.room.state.players.get(bullet.ownerId);

          const onBulletCollision = pickupMethod.onBulletCollision(shooter);

          pickup.health = pickupMethod.health;

          if (onBulletCollision) {
            this.room.state.pickups.splice(
              this.room.state.pickups.indexOf(pickup),
              1
            ); // Remove pickup
          }

          if (pickup.destroyBulletOnCollision) {
            destroyedBullets.push({
              bullet,
              colissionType: "pickup",
              pickupId: pickup.id,
            });

            bulletsToRemove.push(bullet);
          }
          break;
        }
      }

      // Query nearby players
      const nearbyPlayers = this.spatialManager.queryNearbyObjects(
        bullet.x,
        bullet.y,
        20, // Query radius
        this.spatialManager.playerIndex
      );

      for (const { player } of nearbyPlayers) {
        if (
          this.collisionSystem.detectCollision(
            {
              type: "circle",
              x: player.x,
              y: player.y,
              radius: player.hitRadius,
            },
            {
              type: "circle",
              x: bullet.x,
              y: bullet.y,
              radius: 5, // Bullet radius
            }
          )
        ) {
          const shooter = this.room.state.players.get(bullet.ownerId);
          if (!shooter) return;

          destroyedBullets.push({
            bullet,
            colissionType: "player",
            playerId: player.sessionId,
            shooterId: shooter.sessionId,
          });

          this.onBulletHit(player.sessionId, bullet, player, shooter);
          bulletsToRemove.push(bullet);
          break;
        }
      }

      // Query nearby bullets (bullet vs bullet collision)
      const nearbyBullets = this.spatialManager.queryNearbyObjects(
        bullet.x,
        bullet.y,
        10, // Query radius
        this.spatialManager.bulletIndex
      );

      for (const { bullet: otherBullet } of nearbyBullets) {
        if (bullet === otherBullet) continue;

        const dx = bullet.x - otherBullet.x;
        const dy = bullet.y - otherBullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
          destroyedBullets.push({
            bullet,
            colissionType: "bullet",
            collidedWithId: otherBullet.id,
          });
          bulletsToRemove.push(bullet, otherBullet);
          break;
        }
      }
    });

    // Remove bullets and broadcast destroyed bullets
    bulletsToRemove.forEach((bullet) => {
      const index = this.room.state.bullets.indexOf(bullet);
      if (index !== -1) {
        this.room.state.bullets.splice(index, 1);
      }
    });

    if (destroyedBullets.length > 0) {
      this.room.broadcast("bullets-destroyed", destroyedBullets);
    }
  }

  onBulletHit(
    sessionId: string,
    bullet: Bullet,
    player: Player,
    shooter: Player
  ) {
    if (!player.isProtected) {
      player.health -= shooter.bulletDamage;
    }

    // Handle player death
    if (player.health <= 0) {
      this.onPlayerDeath(sessionId, player, shooter);
    }
  }

  onPlayerDeath(sessionId: string, player: Player, shooter: Player) {
    player.lastKilledAt = Date.now();
    player.isDead = true;
    player.deaths += 1;

    shooter.kills += 1;

    this.room.broadcast("player-death", {
      sessionId,
      player,
      killer: shooter,
      respawnDelay: player.respawnDelay,
    });

    player.pickups.forEach((pickup) => {
      const droppedPickup = PickupFactory.createPickup(
        pickup.type,
        player.x,
        player.y,
        pickup
      );
      if (droppedPickup) {
        droppedPickup.id = nanoid();
        droppedPickup.isRedeployable = pickup.isRedeployable;
        droppedPickup.redeployTimeout = pickup.redeployTimeout;
        droppedPickup.wasDropped = true;

        this.room.state.pickups.push(droppedPickup); // Add it back
      }
    });

    if (player.type === "bot" && !player.respawnDisabled) {
      setTimeout(async () => {
        await player.respawn(this.tilemapManager);
      }, player.respawnDelay * 1000);
    }
  }

  onPickupColission(player: Player, pickup: Pickup, index: number) {}
}
