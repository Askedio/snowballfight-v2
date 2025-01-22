import type { Pickup } from "../schemas/Pickup";
import { DevilPickup } from "./Devil";
import { SkullPickup } from "./Skull";
import { SwordPickup } from "./Sword";
import { TreasurePickup } from "./Treasure";
import { WingsPickup } from "./Wings";
import { TreePickup } from "./Tree";
import { SnowmanPickup } from "./Snowman";
import { CratePickup } from "./Crate";

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class PickupFactory {
  static createPickup(type: string, x: number, y: number): Pickup {
    switch (type) {
      case "crate":
        return new CratePickup(x, y);
      case "snowman":
        return new SnowmanPickup(x, y);
      case "tree":
        return new TreePickup(x, y);
      case "devil":
        return new DevilPickup(x, y);
      case "skull":
        return new SkullPickup(x, y);
      case "sword":
        return new SwordPickup(x, y);
      case "treasure":
        return new TreasurePickup(x, y);
      case "wings":
        return new WingsPickup(x, y);
      default:
        return null;
    }
  }
}
