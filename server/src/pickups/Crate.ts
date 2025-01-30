import { Pickup } from "../schemas/Pickup";

export class CratePickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("crate", config.x || 0, config.y || 0);
    Object.assign(this, config);

    this.asset = "planter";
    this.scale = 0.18;

    // this.asset = "winterobjects";
    // this.isSprite = true;
    //  this.spriteFrame = "Crate.png";

    //this.rotation = -4 + Math.random() * 8;
    this.collisionshape = "box";
    this.colissionHeight = 100;
    this.colissionWidth = 100;

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
