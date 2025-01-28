import { Pickup } from "../schemas/Pickup";

export class TreePickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("tree", config.x || 0, config.y || 0);
    Object.assign(this, config);

    this.asset = "tree";
    this.scale = 0.7;
    this.bringToTop = true;
    this.colissionOffsetY = 47;
   
    this.blocking = true;
    this.health = config.health || 100;
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
