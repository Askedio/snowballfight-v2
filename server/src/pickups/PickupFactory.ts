import type { Pickup } from "../schemas/Pickup";
import { DevilPickup } from "./Devil";
import { SkullPickup } from "./Skull";
import { SwordPickup } from "./Sword";
import { TreasurePickup } from "./Treasure";
import { WingsPickup } from "./Wings";
import { TreePickup } from "./Tree";
import { SnowmanPickup } from "./Snowman";
import { CratePickup } from "./Crate";

export class PickupFactory {
  static createPickup(type: string, x: number, y: number, config: Partial<Pickup> = {}): Pickup | null {
    const baseConfig = { type, x, y, ...config };
    switch (type) {
      case "crate":
        return new CratePickup(baseConfig);
      case "snowman":
        return new SnowmanPickup(baseConfig);
      case "tree":
        return new TreePickup(baseConfig);
      case "devil":
        return new DevilPickup(baseConfig);
      case "skull":
        return new SkullPickup(baseConfig);
      case "sword":
        return new SwordPickup(baseConfig);
      case "treasure":
        return new TreasurePickup(baseConfig);
      case "wings":
        return new WingsPickup(baseConfig);
      default:
        return null;
    }
  }
}
