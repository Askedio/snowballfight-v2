import { Pickup } from "../schemas/Pickup";

export class SkullPickup extends Pickup {
  constructor(x: number, y: number) {
    super("skull", x, y);
    this.asset = "skull";
    this.destroyOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    player.health -= 20; // Decrease player's health
  }
}
