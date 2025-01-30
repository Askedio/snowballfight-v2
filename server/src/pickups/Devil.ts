import { Pickup } from "../schemas/Pickup";

export class DevilPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("devil", config.x || 0, config.y || 0);
    Object.assign(this, config);

    this.asset = "devil";
    this.scale = 1;

    this.destroyOnCollision = true;
    this.bulletKills = true;

    this.playAudioOnPickup = true;
    this.audioKey = "laugh1";
  }

  onPlayerCollision(player: any): void {
    player.previousAmmo = player.ammo;
    player.applyTemporaryChange("bulletSpeed", player.bulletSpeed + 5, 5000); // Increase bullet speed for 5 seconds
    player.applyTemporaryChange("bulletCooldown", 200, 5000); // Reduce cooldown for 5 seconds
    player.applyTemporaryChange("ammoUnlimited", true, 5000); // Reduce cooldown for 5 seconds
    player.applyTemporaryChange("ammo", player.ammo, 5000, player.previousAmmo); // Reduce cooldown for 5 seconds
  }

  onBulletCollision(shooter: any): boolean {
    return this.bulletKills;
  }
}
