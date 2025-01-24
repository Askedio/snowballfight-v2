import { type } from "@colyseus/schema";
import { BaseRoomState } from "./BaseRoomState";

export class FreeForAllRoomState extends BaseRoomState {
  @type("string") mode = "ffa";
}
