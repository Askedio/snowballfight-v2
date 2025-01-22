import { Command } from "@colyseus/command";
import type { FreeForAllRoom } from "../rooms/FreeForAllRoom";
import { PickupFactory } from "../pickups/PickupFactory";
import { nanoid } from "nanoid";
import type { InputData } from "../interfaces/InputData";
import { Bullet } from "../schemas/Bullet";
import type { Player } from "../schemas/Player";
import type { TilemapManager } from "../TilemapManager";

export class FixedTickCommand extends Command<
  FreeForAllRoom,
  { tilemapManager: TilemapManager }
> {
  private tilemapManager: TilemapManager;

  execute(payload: this["payload"]) {
    this.tilemapManager = payload.tilemapManager;

    this.room.state.players.forEach((player) => {
      if (player.isDead) {
        player.isMoving = false;
        return;
      }

      let input: InputData;
      let isCurrentlyMoving = false;

      while ((input = player.inputQueue.shift())) {
        const velocity = player.speed || 2;
        const angle = player.rotation;
        let newX = player.x;
        let newY = player.y;

        // Check for movement input
        if (input.left) {
          player.rotation -= 0.03;
          isCurrentlyMoving = false;
        }
        if (input.right) {
          player.rotation += 0.03;
          isCurrentlyMoving = false;
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

        // Check for collisions with pickups
        let isBlockedByPickup = false;
        this.room.state.pickups.forEach((pickup) => {
          const realPickup = PickupFactory.createPickup(
            pickup.type,
            pickup.x,
            pickup.y
          );
          if (!realPickup) return;

          const dx = pickup.x - newX;
          const dy = pickup.y - newY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const pickupRadius = pickup.radius;
          const playerRadius = player.playerRadius;

          // Collision detection with blocking pickups
          if (distance < pickupRadius + playerRadius) {
            realPickup.onPlayerCollision(player); // Trigger collision effect

            if (realPickup.blocking) {
              isBlockedByPickup = true; // Prevent movement if pickup blocks
            }

            // Handle pickup destruction and redeployment
            if (realPickup.destroyOnCollision) {
              const pickupIndex = this.room.state.pickups.indexOf(pickup);
              this.room.state.pickups.splice(pickupIndex, 1); // Remove the pickup

              if (realPickup.isRedeployable) {
                setTimeout(() => {
                  const redeployedPickup = PickupFactory.createPickup(
                    realPickup.type,
                    realPickup.x,
                    realPickup.y
                  );
                  if (redeployedPickup) {
                    redeployedPickup.id = nanoid();
                    redeployedPickup.isRedeployable = realPickup.isRedeployable;
                    redeployedPickup.redeployTimeout =
                      realPickup.redeployTimeout;

                    this.room.state.pickups.push(redeployedPickup); // Add it back
                  }
                }, realPickup.redeployTimeout);
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

        // Handle shooting
        if (input.shoot) {
          this.fireBullet(player);
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

    this.room.state.bullets.push(bullet);
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

      this.room.state.pickups.forEach((pickup) => {
        const realPickup = PickupFactory.createPickup(
          pickup.type,
          pickup.x,
          pickup.y
        );

        if (!realPickup) return;

        const dx = pickup.x - bullet.x;
        const dy = pickup.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 16 && realPickup.onBulletCollision()) {
          this.room.state.pickups.splice(
            this.room.state.pickups.indexOf(pickup),
            1
          ); // Remove pickup

          bullet.colissionType = "pickup";
          this.room.broadcast("bullet-destroyed", { bullet, pickup });

          bulletsToRemove.push(bullet);
          return;
        }
      });

      // Check collisions with players
      for (const [sessionId, player] of this.room.state.players.entries()) {
        if (player.isDead) continue; // Skip dead players

        if (bullet.ownerId !== sessionId) {
          const dx = bullet.x - player.x;
          const dy = bullet.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < player.hitRadius) {
            player.health -= 20;

            // Handle player death
            if (player.health <= 0) {
              player.isDead = true;
              player.deaths += 1;

              // Increment killer's kills count
              const killer = this.room.state.players.get(bullet.ownerId);
              if (killer) {
                killer.kills += 1;
                console.log(
                  `Player ${bullet.ownerId} now has ${killer.kills} kills.`
                );
              }

              console.log(`Player ${sessionId} was killed.`);
              this.room.broadcast("player-death", {
                sessionId,
                player,
                killer,
              }); // Emit death event

              bullet.colissionType = "player";
              this.room.broadcast("bullet-destroyed", {
                bullet,
                player,
                killer,
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
}
