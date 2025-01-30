import { Pickup } from "../schemas/Pickup";

export class TreasurePickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("treasure", config.x || 0, config.y || 0);
    Object.assign(this, config);
  
    this.asset = "treasure";
    this.scale = 1;
    
    this.destroyOnCollision = true;
  }

  onPlayerCollision(player: any): void {
    if (player.health >= 100) {
      return;
    }

    player.health += 20; // Increase player's health
  }
}
