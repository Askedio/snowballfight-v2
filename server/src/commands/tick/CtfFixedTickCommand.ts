import type { CtfRoom } from './../../rooms/CtfRoom';
import type { TilemapManager } from "../../TilemapManager";
import type { Collision } from "../../classes/Collision";
import { BaseTickCommand } from "./BaseFixedTickCommand";

export class CtfFixedTickCommand extends BaseTickCommand<CtfRoom> {
  tilemapManager: TilemapManager;
  collisionSystem: Collision;
}
