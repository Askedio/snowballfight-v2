import type { TsRoomState } from './../../states/TsRoomState';
import type { TsRoom } from "./../../rooms/TsRoom";
import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import { BaseTickCommand } from "./BaseFixedTickCommand";

export class TsFixedTickCommand extends BaseTickCommand<TsRoom, TsRoomState> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;
}
