import { Pickup } from "../Pickup";

export class TreasurePickup extends Pickup {
  constructor(x: number, y: number, asset: string) {
    super("treasure", x, y, asset);
    this.destroyOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    player.health += 50; // Increase player's health
  }
}
