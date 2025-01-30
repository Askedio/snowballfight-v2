import { Pickup } from "../schemas/Pickup";

export class SkullPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("skull", config.x || 0, config.y || 0);
    Object.assign(this, config);

    this.asset = "skull";
    this.scale = .2;

    this.destroyOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    if (player.health <= 20) {
      return;
    }

    player.health -= 20; // Decrease player's health
  }
}
