import type { CtfRoom } from './../../rooms/CtfRoom';
import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import { BaseTickCommand } from "./BaseFixedTickCommand";
import type { CtfRoomState } from '../../states/CtfRoomState';

export class CtfFixedTickCommand extends BaseTickCommand<CtfRoom, CtfRoomState> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;
}
