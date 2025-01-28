import type { FreeForAllRoom } from "../../rooms/FreeForAllRoom";
import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import { BaseTickCommand } from "./BaseFixedTickCommand";
import type { FreeForAllRoomState } from "../../states/FreeForAllRoomState";

export class FreeForAllFixedTickCommand extends BaseTickCommand<
  FreeForAllRoom,
  FreeForAllRoomState
> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;
}
