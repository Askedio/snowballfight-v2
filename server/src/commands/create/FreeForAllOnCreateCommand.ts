import type { FreeForAllRoomState } from "./../../states/FreeForAllRoomState";
import type { FreeForAllRoom } from "./../../rooms/FreeForAllRoom";
import type { TilemapManager } from "../../TilemapManager";
import { BaseTeamOnCreateCommand } from "./BaseTeamOnCreateCommand";

export class FreeForAllOnCreateCommand extends BaseTeamOnCreateCommand<
  FreeForAllRoom,
  FreeForAllRoomState
> {
  tilemapManager: TilemapManager;
  maxBots: number;
}
