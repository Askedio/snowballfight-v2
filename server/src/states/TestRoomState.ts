import { type } from "@colyseus/schema";
import { BaseRoomState } from "./BaseRoomState";

export class TestRoomState extends BaseRoomState {
  @type("string") mode = "test";
}
