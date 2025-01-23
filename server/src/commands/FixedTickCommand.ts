import { Command } from "@colyseus/command";
import type { FreeForAllRoom } from "../rooms/FreeForAllRoom";
import { PickupFactory } from "../pickups/PickupFactory";
import type { InputData } from "../interfaces/InputData";
import { Bullet } from "../schemas/Bullet";
import type { Player } from "../schemas/Player";
import type { TilemapManager } from "../TilemapManager";
import type { Collision } from "../classes/Collision";
import { assignRandomPosition, resetPlayer } from "../lib/player.lib";

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

        if (distance <= player.playerSize) {
          newX = player.x;
          newY = player.y;
          isCurrentlyMoving = false;
        }
      }

      if (!isReloading && (input.shoot || input.pointer?.shoot)) {
        this.fireBullet(player);
      }

      // Check collisions (same as your existing logic)
      const isColliding = this.tilemapManager.isColliding(
        newX,
        newY,
        player.playerSize,
        player.playerSize
      );

      if (!isColliding) {
        player.x = newX;
        player.y = newY;
      }

      player.tick = input.tick;
      player.isMoving = isCurrentlyMoving;
    });

    this.updateBullets();
  }

  fireBullet(player: Player) {
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
                setTimeout(() => {
                  resetPlayer(player, this.tilemapManager);
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
    const shouldReload = Math.random() < 0.2 && bot.ammo < bot.maxAmmo; // 20% chance to reload if ammo isn't full

    const canShoot = Math.random() < 0.2;

    // @ts-ignore
    return {
      up: distance > 250, // Move closer if far
      down: distance < 250, // Back off if too close
      left: distance > 0 ? Math.random() > 0.5 : false, // Random strafing
      right: distance > 0 ? Math.random() > 0.5 : false,
      shoot: canShoot && distance < 300 && !shouldReload, // Shoot only if within range and not reloading
      pointer: {
        x: target?.x,
        y: target?.y,
        shoot: canShoot && distance < 300 && !shouldReload, // Aim at the target if shooting
        reload: shouldReload, // Reload if shouldReload is true
      },
      r: shouldReload, // Reload if the bot is reloading
    };
  }
}
