import { type } from "@colyseus/schema";
import { TeamRoomState } from "./TeamRoomState";

export class TsRoomState extends TeamRoomState {
  @type("string") mode = "ts";
  
  timeLimit = 1000 * 10;
  canRespawnOnDeath = false;
}
