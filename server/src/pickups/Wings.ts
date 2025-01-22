import { Pickup } from "../schemas/Pickup";

export class WingsPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("wings", config.x || 0, config.y || 0);
    Object.assign(this, config); // Assign all additional parameters
  
    this.asset = "wings";
    this.destroyOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    if (player.speed >= 6) return;

    player.applyTemporaryChange("speed", player.speed + 0.5, 10000);
  }

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
