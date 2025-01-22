import { Pickup } from "../schemas/Pickup";

export class SnowmanPickup extends Pickup {
  constructor(x: number, y: number) {
    super("snowman", x, y);
    this.asset = "snowman";
    this.destroyOnCollision = true; // Pickup is destroyed on player collision
    this.bulletKills = true;
    this.scale = 0.4;
  }

  onPlayerCollision(player: any): void {
    player.applyTemporaryChange("bulletSpeed", player.bulletSpeed + 5, 5000); // Increase bullet speed for 5 seconds
    player.applyTemporaryChange("bulletCooldown", 200, 5000); // Reduce cooldown for 5 seconds
  }

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
