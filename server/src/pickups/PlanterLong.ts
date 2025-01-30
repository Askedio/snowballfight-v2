import { Pickup } from "../schemas/Pickup";

export class PlanterLong extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("planterLong", config.x || 0, config.y || 0);
    Object.assign(this, config);

    this.asset = "planter-long";
    this.scale = 0.2;

    this.rotation = Math.random() < 0.5 ? 0 : Math.PI / 2;
    this.collisionshape = "box";
    this.colissionHeight = 110;
    this.colissionWidth = 50;

    this.blocking = true;
    this.health = config.health || 40;
    this.destroyBulletOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    //
  }

  onBulletCollision(shooter: any): boolean {
    this.health -= this.damange;

    return this.health <= 0;
  }
}
