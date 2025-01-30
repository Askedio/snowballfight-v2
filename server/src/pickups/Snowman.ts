import { Pickup } from "../schemas/Pickup";

export class SnowmanPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("snowman", config.x || 0, config.y || 0);
    Object.assign(this, config);

    this.asset = "snowman";
    this.scale = 0.4;
    this.colissionOffsetY = 14;
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

  onBulletCollision(): boolean {
    this.health -= this.damange;

    return this.health <= 0;
  }
}
