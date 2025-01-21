import { Pickup } from "../Pickup";

export class SkullPickup extends Pickup {
    constructor(x: number, y: number, asset: string) {
      super("skull", x, y, asset);
      this.destroyOnCollision = true;
    }
  
    onPlayerCollision(player: any): void {
      console.log("Player encountered a skull!");
      player.health -= 20; // Decrease player's health
    }
  }