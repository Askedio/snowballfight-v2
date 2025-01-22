import { Pickup } from "../schemas/Pickup";

export class SwordPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("sword", config.x || 0, config.y || 0);
    Object.assign(this, config); // Assign all additional parameters
  
    this.asset = "sword";
    this.destroyOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    player.applyTemporaryChange("bulletFireRate", 5, 10000);
  }

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
