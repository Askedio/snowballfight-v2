import { Pickup } from "../Pickup";

export class SwordPickup extends Pickup {
  constructor(x: number, y: number, asset: string) {
    super("sword", x, y, asset);
    this.destroyOnCollision = true; // Pickup is destroyed on player collision
  }

  onPlayerCollision(player: any): void {
    player.attackPower += 10; // Example: Increase player's attack power
  }

  onBulletCollision(): boolean {
    return this.bulletKills; // Allow bullets to destroy it if bulletKills is true
  }
}
