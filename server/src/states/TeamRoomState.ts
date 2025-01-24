import { type } from "@colyseus/schema";
import { BaseRoomState } from "./BaseRoomState";

export class TeamRoomState extends BaseRoomState {
  @type("boolean") trackPlayerScore = false;
  @type("string") playerScoreType = "kills";

  @type("number") redScore = 0;
  @type("number") blueScore = 0;
  @type("number") timeLimit = 1000 * 60 * 5; // 5m
  @type("string") roundStartedAt: string;
}
