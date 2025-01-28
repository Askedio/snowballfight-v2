import type { FreeForAllRoomState } from "./../../states/FreeForAllRoomState";
import type { FreeForAllRoom } from "./../../rooms/FreeForAllRoom";
import type { TilemapManager } from "../../classes/TilemapManager";
import { BaseOnCreateCommand } from "./BaseOnCreateCommand";

export class FreeForAllOnCreateCommand extends BaseOnCreateCommand<
  FreeForAllRoom,
  FreeForAllRoomState
> {
  tilemapManager: TilemapManager;
  maxBots: number;
}
