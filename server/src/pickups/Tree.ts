import { Pickup } from "../schemas/Pickup";

export class TreePickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("tree", config.x || 0, config.y || 0);
    Object.assign(this, config); // Assign all additional parameters
  
    this.asset = "tree";
    this.scale = 0.7;
    this.bringToTop = true;
    this.blocking = true;
    this.colissionOffsetY = 47;

    this.health = config.health || 100
  }

  onPlayerCollision(player: any): void {
    // 
  }

  onBulletCollision(): boolean {
   
    this.health -= this.damange;

    console.log(this.health)

    return this.health <= 0;
  }
}
