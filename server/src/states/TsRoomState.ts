import { type } from "@colyseus/schema";
import { TeamRoomState } from "./TeamRoomState";

export class TsRoomState extends TeamRoomState {
  @type("string") mode = "ts";
}
