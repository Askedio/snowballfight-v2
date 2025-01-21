import { Pickup } from "../Pickup";

export class WingsPickup extends Pickup {
    constructor(x: number, y: number, asset: string) {
      super("wings", x, y, asset);
      this.destroyOnCollision = true; // Pickup is destroyed on player collision
    }
  
    onPlayerCollision(player: any): void {
      console.log("Player collected wings!");
      player.speed += 1; // Example: Increase player's speed
    }
  
    onBulletCollision(): boolean {
      console.log("Bullet hit wings pickup!");
      return this.bulletKills; // Allow bullets to destroy it if bulletKills is true
    }
  }
  