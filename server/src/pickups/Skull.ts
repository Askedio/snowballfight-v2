import { Pickup } from "../schemas/Pickup";

export class SkullPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("skull", config.x || 0, config.y || 0);
    Object.assign(this, config); // Assign all additional parameters
  
    this.asset = "skull";
    this.destroyOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    player.health -= 20; // Decrease player's health
  }
}
