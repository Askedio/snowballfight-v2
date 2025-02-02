import { Pickup } from "../schemas/Pickup";

export class TreePickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("tree", config.x || 0, config.y || 0);
    Object.assign(this, config);

    this.asset = "tree";
    this.scale = 0.2 + Math.random() * 0.06;
    this.bringToTop = true;
    this.colissionOffsetY = 0;
    this.radius = 14;
    //this.rotation = 6;
    this.blocking = true;
    this.health = config.health || 100;
    this.destroyBulletOnCollision = true;
    this.tint = "0xffffff";
    this.changeOpacityWhenClose = true;
    this.opacityChangeWhenClose = 0.5;
    this.opacityChangeRadius = 70;
  }

  onPlayerCollision(player: any): void {
    //
  }

  onBulletCollision(shooter: any): boolean {
    this.health -= this.damange;

    return this.health <= 0;
  }
}
