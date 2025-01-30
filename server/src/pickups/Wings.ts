import { Pickup } from "../schemas/Pickup";

export class WingsPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("wings", config.x || 0, config.y || 0);
    Object.assign(this, config);
  
    this.asset = "wings";
    this.scale = .2;
    
    this.destroyOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    if (player.speed >= 6) return;

    player.applyTemporaryChange("speed", player.speed + 0.5, 10000);
  }

  onBulletCollision(shooter: any): boolean {
    return this.bulletKills;
  }
}
