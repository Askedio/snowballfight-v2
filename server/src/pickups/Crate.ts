import { Pickup } from "../schemas/Pickup";

export class CratePickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("crate", config.x || 0, config.y || 0);
    Object.assign(this, config); // Assign all additional parameters
  
    this.destroyOnCollision = true;
    this.asset = "winterobjects";
    this.isSprite = true;
    this.spriteFrame = "Crate.png";
    this.scale = 0.7;
    this.rotation = 6;

    this.colissionShape = "box";
    this.colissionHeight = 60;
    this.colissionWidth = 60;
    this.bringToTop = true;
  }

  onPlayerCollision(player: any): void {
    if (player.speed >= 6) return;

    player.applyTemporaryChange("speed", player.speed + 0.5, 10000);
  }

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
