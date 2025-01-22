import { Pickup } from "../schemas/Pickup";

export class SwordPickup extends Pickup {
  constructor(x: number, y: number) {
    super("sword", x, y);
    this.asset = "sword";
    this.destroyOnCollision = true; // Pickup is destroyed on player collision
  }

  onPlayerCollision(player: any): void {
    player.attackPower += 10; // Example: Increase player's attack power
  }

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
