import { Pickup } from "../schemas/Pickup";

export class TreasurePickup extends Pickup {
  constructor(x: number, y: number) {
    super("treasure", x, y);
    this.asset = "treasure";
    this.destroyOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    if (player.health >= 200) {
      return;
    }

    player.health += 50; // Increase player's health
  }
}
