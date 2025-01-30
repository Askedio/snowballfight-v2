import { Pickup } from "../schemas/Pickup";

export class SwordPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("sword", config.x || 0, config.y || 0);
    Object.assign(this, config);
  
    this.asset = "sword";
    this.scale = .2;

    this.destroyOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    player.previousAmmo = player.ammo;
    player.applyTemporaryChange("bulletSpeed", player.bulletSpeed + 2, 5000); // Increase bullet speed for 5 seconds
    player.applyTemporaryChange("bulletCooldown", 500, 5000); // Reduce cooldown for 5 seconds
    player.applyTemporaryChange("ammoUnlimited", true, 5000); // Reduce cooldown for 5 seconds
    player.applyTemporaryChange("ammo", player.ammo, 5000, player.previousAmmo); // Reduce cooldown for 5 seconds
  }

  onBulletCollision(shooter: any): boolean {
    return this.bulletKills;
  }
}
