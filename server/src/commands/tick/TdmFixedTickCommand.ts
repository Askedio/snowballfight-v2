import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import { BaseTickCommand } from "./BaseFixedTickCommand";
import type { TdmRoom } from "../../rooms/TdmRoom";

export class TdmFixedTickCommand extends BaseTickCommand<TdmRoom> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;
}
