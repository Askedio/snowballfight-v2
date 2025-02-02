import type { TdmRoomState } from "./../../states/TdmRoomState";
import type { TdmRoom } from "./../../rooms/TdmRoom";
import type { MapManager } from "../../classes/MapManager";
import { BaseTeamOnCreateCommand } from "./BaseTeamOnCreateCommand";

export class TdmOnCreateCommand extends BaseTeamOnCreateCommand<
  TdmRoom,
  TdmRoomState
> {
  mapManager: MapManager;
  maxBots: number;
}
