import { type } from "@colyseus/schema";
import { TeamRoomState } from "./TeamRoomState";

export class CtfRoomState extends TeamRoomState {
  @type("string") mode = "ctf";

  playerScoreType = "captures";
}
