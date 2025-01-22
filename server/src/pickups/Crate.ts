import { Pickup } from "../schemas/Pickup";

export class CratePickup extends Pickup {
  constructor(x: number, y: number) {
    super("crate", x, y);
    this.destroyOnCollision = true; // Pickup is destroyed on player collision
    this.asset = "winterobjects";
    this.isSprite = true;
    this.spriteFrame = "Crate.png";
    this.scale = .7;
    this.rotation = 6
  }

  onPlayerCollision(player: any): void {
    if (player.speed >= 6) return;

    player.applyTemporaryChange("speed", player.speed + 0.5, 10000);
  }

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
