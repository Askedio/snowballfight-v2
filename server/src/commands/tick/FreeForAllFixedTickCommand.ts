import type { FreeForAllRoom } from "../../rooms/FreeForAllRoom";
import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import { BaseTickCommand } from "./BaseFixedTickCommand";

export class FreeForAllFixedTickCommand extends BaseTickCommand<FreeForAllRoom> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;
}
