import { Pickup } from "../schemas/Pickup";

export class TreePickup extends Pickup {
  constructor(x: number, y: number) {
    super("tree", x, y);
    this.asset = "tree";
    this.destroyBulletOnCollision = true;
    this.scale = 0.7;
    this.bringToTop = true;
    this.blocking = true;
    this.colissionOffsetY = 47
  }

  onPlayerCollision(player: any): void {
    if (player.speed >= 6) return;

    player.applyTemporaryChange("speed", player.speed + 0.5, 10000);
  }

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
