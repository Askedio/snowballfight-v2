import { Pickup } from "../schemas/Pickup";

export class SnowmanPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("snowman", config.x || 0, config.y || 0);
    Object.assign(this, config);

    this.asset = "snowman";
    this.scale = 1;
    this.colissionOffsetY = 16;
    this.colissionOffsetX = 1;
    this.bringToTop = true;
    this.radius = 24;

    this.bulletKills = true;
    this.blocking = true;
    this.health = config.health || 40;
    this.destroyBulletOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    //
  }

  onBulletCollision(shooter: any): boolean {
    this.health -= this.damange;

    if (this.health <= 0) {
      shooter.health = shooter.defaultHealth;
      shooter.ammo = shooter.maxAmmo;
    }

    return this.health <= 0;
  }
}
