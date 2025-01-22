import { Pickup } from "../schemas/Pickup";

export class SnowmanPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("snowman", config.x || 0, config.y || 0);
    Object.assign(this, config); // Assign all additional parameters
  
    this.asset = "snowman";
    this.destroyOnCollision = true;
    this.bulletKills = true;
    this.scale = 0.4;
    this.colissionOffsetY = 14;
    this.colissionOffsetX = 1;
    this.bringToTop = true
    this.radius = 24
  }

  onPlayerCollision(player: any): void {
    player.applyTemporaryChange("bulletSpeed", player.bulletSpeed + 5, 5000); // Increase bullet speed for 5 seconds
    player.applyTemporaryChange("bulletCooldown", 200, 5000); // Reduce cooldown for 5 seconds
  }

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
