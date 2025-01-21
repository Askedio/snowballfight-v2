import { Pickup } from "../Pickup";

export class SkullPickup extends Pickup {
  constructor(x: number, y: number, asset: string) {
    super("skull", x, y, asset);
    this.destroyOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    player.health -= 20; // Decrease player's health
  }
}
