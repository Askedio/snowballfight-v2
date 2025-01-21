import { Pickup } from "../Pickup";

export class DevilPickup extends Pickup {
  constructor(x: number, y: number, asset: string) {
    super("devil", x, y, asset);
    this.destroyOnCollision = true; // Pickup is destroyed on player collision
    this.bulletKills = true;
  }

  onPlayerCollision(player: any): void {
    console.log("Player encountered a devil!");
    //player.health -= 30; // Decrease player's health more significantly
    player.applyTemporaryChange("bulletSpeed", player.bulletSpeed + 5, 5000); // Increase bullet speed for 5 seconds
    player.applyTemporaryChange("bulletCooldown", 200, 5000); // Reduce cooldown for 5 seconds
  }

  onBulletCollision(): boolean {
    // console.log("Bullet hit a devil pickupok!");
    return this.bulletKills; // Allow bullets to destroy it if bulletKills is true
  }
}
