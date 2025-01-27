import type { TilemapManager } from "../../TilemapManager";
import type { CtfRoomState } from "../../states/CtfRoomState";
import type { CtfRoom } from "../../rooms/CtfRoom";
import { BaseTeamOnCreateCommand } from "./BaseTeamOnCreateCommand";

export class CtfOnCreateCommand extends BaseTeamOnCreateCommand<
  CtfRoom,
  CtfRoomState
> {
  tilemapManager: TilemapManager;
  maxBots: number;
}
