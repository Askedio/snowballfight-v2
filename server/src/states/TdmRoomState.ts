import { type } from "@colyseus/schema";
import { TeamRoomState } from "./TeamRoomState";

export class TdmRoomState extends TeamRoomState {
  @type("string") mode = "tdm";
}
