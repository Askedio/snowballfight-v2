import type { Pickup } from "./Pickup";
import { DevilPickup } from "./pickups/Devil";
import { SkullPickup } from "./pickups/Skull";
import { SwordPickup } from "./pickups/Sword";
import { TreasurePickup } from "./pickups/Treasure";
import { WingsPickup } from "./pickups/Wings";

export class PickupFactory {
  static createPickup(
    type: string,
    x: number,
    y: number,
    asset: string
  ): Pickup {
    switch (type) {
      case "devil":
        return new DevilPickup(x, y, asset);
      case "skull":
        return new SkullPickup(x, y, asset);
      case "sword":
        return new SwordPickup(x, y, asset);
      case "treasure":
        return new TreasurePickup(x, y, asset);
      case "wings":
        return new WingsPickup(x, y, asset);
      default:
       return null
    }
  }
}