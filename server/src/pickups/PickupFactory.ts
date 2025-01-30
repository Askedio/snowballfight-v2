import { PlanterLong } from "./PlanterLong";
import type { Pickup } from "../schemas/Pickup";
import { DevilPickup } from "./Devil";
import { SkullPickup } from "./Skull";
import { SwordPickup } from "./Sword";
import { TreasurePickup } from "./Treasure";
import { WingsPickup } from "./Wings";
import { TreePickup } from "./Tree";
import { SnowmanPickup } from "./Snowman";
import { CratePickup } from "./Crate";
import { RedFlagPickup } from "./RedFlag";
import { BlueFlagPickup } from "./BlueFlag";

export class PickupFactory {
  static createPickup(
    type: string,
    x: number,
    y: number,
    config: Partial<Pickup> = {}
  ): Pickup | null {
    const excludedKeys = ["x", "y"];

    const filteredConfig = Object.fromEntries(
      Object.entries(config).filter(([key]) => !excludedKeys.includes(key))
    );

    const baseConfig = { type, x, y, ...filteredConfig };
    switch (type) {
      case "crate":
        return new CratePickup(baseConfig);
      case "planterLong":
        return new PlanterLong(baseConfig);
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
      case "redFlag":
        return new RedFlagPickup(baseConfig);
      case "blueFlag":
        return new BlueFlagPickup(baseConfig);
      default:
        return null;
    }
  }
}
