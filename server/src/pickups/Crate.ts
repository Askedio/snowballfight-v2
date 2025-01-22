import { Pickup } from "../schemas/Pickup";

export class CratePickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("crate", config.x || 0, config.y || 0);
    Object.assign(this, config);

    this.asset = "winterobjects";
    this.isSprite = true;
    this.spriteFrame = "Crate.png";
    this.scale = 0.7;
    this.rotation = 6;

    this.colissionShape = "box";
    this.colissionHeight = 60;
    this.colissionWidth = 60;
    this.bringToTop = true;

    this.blocking = true;
    this.health = config.health || 40;
  }

  onPlayerCollision(player: any): void {
    //
  }

  onBulletCollision(): boolean {
    this.health -= this.damange;

    return this.health <= 0;
  }
}
