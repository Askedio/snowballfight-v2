import type { TdmRoomState } from "./../../states/TdmRoomState";
import type { TdmRoom } from "./../../rooms/TdmRoom";
import type { TilemapManager } from "../../classes/TilemapManager";
import { BaseTeamOnCreateCommand } from "./BaseTeamOnCreateCommand";

export class TdmOnCreateCommand extends BaseTeamOnCreateCommand<
  TdmRoom,
  TdmRoomState
> {
  tilemapManager: TilemapManager;
  maxBots: number;
}
