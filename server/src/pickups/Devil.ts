import { Pickup } from "../Pickup";

export class DevilPickup extends Pickup {
  constructor(x: number, y: number, asset: string) {
    super("devil", x, y, asset);
    this.destroyOnCollision = true; // Pickup is destroyed on player collision
    this.bulletKills = true;
  }

  onPlayerCollision(player: any): void {
    player.applyTemporaryChange("bulletSpeed", player.bulletSpeed + 5, 5000); // Increase bullet speed for 5 seconds
    player.applyTemporaryChange("bulletCooldown", 200, 5000); // Reduce cooldown for 5 seconds
  }

  onBulletCollision(): boolean {
    return this.bulletKills; // Allow bullets to destroy it if bulletKills is true
  }
}
