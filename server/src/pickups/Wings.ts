import { Pickup } from "../schemas/Pickup";

export class WingsPickup extends Pickup {
  constructor(x: number, y: number, asset: string) {
    super("wings", x, y, asset);
    this.destroyOnCollision = true; // Pickup is destroyed on player collision
  }

  onPlayerCollision(player: any): void {
    if (player.speed >= 6) return;

    player.applyTemporaryChange("speed", player.speed + 0.5, 10000); // Increase speed for 10 seconds
  }

  onBulletCollision(): boolean {
    return this.bulletKills; // Allow bullets to destroy it if bulletKills is true
  }
}
