import { Command } from "@colyseus/command";
import type { FreeForAllRoom } from "../rooms/FreeForAllRoom";
import { PickupFactory } from "../pickups/PickupFactory";
import type { InputData } from "../interfaces/InputData";
import { Bullet } from "../schemas/Bullet";
import type { Player } from "../schemas/Player";
import type { TilemapManager } from "../TilemapManager";
import type { Collision } from "../classes/Collision";
import { resetPlayer } from "../lib/player.lib";
import { nanoid } from "nanoid";

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
      let isColliding = false;

      if (player.type === "bot") {
        // Generate bot input dynamically
        const target = this.getNearestPlayer(player); // Get nearest player (function below)
        input = this.generateBotInput(player, target); // Function to create bot input
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
        isReloading &&
        player.ammo < player.maxAmmo &&
        (!player.lastReloadTime ||
          Date.now() - player.lastReloadTime >= player.reloadDelay)
      ) {
        player.ammo += player.reloadAmount;
        player.ammo = Math.min(player.ammo, player.maxAmmo);
        player.lastReloadTime = Date.now();
      }

      // Movement logic (same as your existing logic)
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

        player.rotation += this.smoothAngle(player.rotation, targetAngle, 0.1);

        if (distance <= player.playerSize * 0.9) {
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
            isColliding = true;
          }
        });
      }

      if (isBlockedByPickup || isColliding) {
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
        bullet.id = nanoid();
        bullet.x = player.x + Math.cos(angle) * 15; // Offset from the player's position
        bullet.y = player.y + Math.sin(angle) * 15;
        bullet.dx = Math.cos(angle) * player.bulletSpeed;
        bullet.dy = Math.sin(angle) * player.bulletSpeed;
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
        if (player.isDead || player.isProtected) {
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
              player.isDead = true;
              player.deaths += 1;

              // Increment killer's kills count
              shooter.kills += 1;

              this.room.broadcast("player-death", {
                sessionId,
                player,
                killer: shooter,
              });

              if (player.type === "bot") {
                setTimeout(async () => {
                  await resetPlayer(player, this.tilemapManager);
                }, 5000);
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

  getNearestPlayer(bot: Player): Player | null {
    let nearestPlayer: Player | null = null;
    let minDistance = 999999;

    if (bot.targetPlayer) {
      const targetPlayer = Array.from(this.state.players.values()).find(
        (_) => _.sessionId === bot.targetPlayer
      );
      if (targetPlayer && !targetPlayer.isDead && !targetPlayer.isProtected) {
        return targetPlayer;
      }
    }

    this.room.state.players.forEach((player) => {
      if (
        player.sessionId !== bot.sessionId &&
        !player.isDead &&
        !player.isProtected
      ) {
        const distance = Math.hypot(bot.x - player.x, bot.y - player.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPlayer = player;
        }
      }
    });

    bot.targetPlayer = nearestPlayer?.sessionId || null;
    return nearestPlayer;
  }

  generateBotInput(bot: Player, target: Player): InputData {
    if (!target?.x) {
      let randomMove: any = {
        up: false,
        down: false,
        left: false,
        right: false,
      };

      const distanceToPointer = Math.hypot(
        bot.randomPointerX - bot.x,
        bot.randomPointerY - bot.y
      );

      if (!bot.randomPointerX || distanceToPointer < 1000) {
        // Adjust threshold as needed
        const worldWidth = 2000; // Replace with your game's world width
        const worldHeight = 1100; // Replace with your game's world height

        bot.randomPointerX = Math.random() * worldWidth;
        bot.randomPointerY = Math.random() * worldHeight;
      }

      // Random movement logic

      // Randomize movement directions
      randomMove = {
        up: distanceToPointer > 0,
        down: false,
        left: false,
        right: false,
        pointer: {
          x: bot.randomPointerX,
          y: bot.randomPointerY,
        },
      };

      return {
        shoot: false, // No shooting without a target
        pointer: {
          x: bot?.x,
          y: bot?.y,
          shoot: false,
          reload: false,
        },
        r: false, // No reloading without a target
        ...randomMove,
      };
    }

    const dx = target?.x - bot.x;
    const dy = target?.y - bot.y;
    const distance = Math.hypot(dx, dy);

    // Random chance to reload instead of shooting
    const shouldReload = Math.random() < 0.2 && bot.ammo <= 4; // 20% chance to reload if ammo isn't full

    const canShoot = Math.random() < 0.2 && bot.ammo > 4;

    // @ts-ignore
    return {
      up: distance > 250, // Move closer if far
      down: distance < 250, // Back off if too close
      left: distance > 0 ? Math.random() > 0.5 : false, // Random strafing
      right: distance > 0 ? Math.random() > 0.5 : false,
      pointer: {
        x: target?.x + (Math.random() - 0.5) * 20, // Random offset between -10 and +10
        y: target?.y + (Math.random() - 0.5) * 20, // Random offset between -10 and +10
        shoot: canShoot && distance < 300 && !shouldReload, // Aim at the target if shooting
        reload: shouldReload, // Reload if shouldReload is true
      },
      r: shouldReload, // Reload if the bot is reloading
    };
  }
}
