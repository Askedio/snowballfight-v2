import type { FreeForAllRoom } from "../../rooms/FreeForAllRoom";
import type { MapManager } from "../../classes/MapManager";
import type { Collision } from "../../classes/Collision";
import { BaseTickCommand } from "./BaseFixedTickCommand";
import type { FreeForAllRoomState } from "../../states/FreeForAllRoomState";

export class FreeForAllFixedTickCommand extends BaseTickCommand<
  FreeForAllRoom,
  FreeForAllRoomState
> {
  mapManager: MapManager;
  collisionSystem: Collision;
}
