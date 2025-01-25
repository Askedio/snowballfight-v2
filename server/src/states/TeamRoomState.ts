import { type } from "@colyseus/schema";
import { BaseRoomState } from "./BaseRoomState";

export class TeamRoomState extends BaseRoomState {
  @type("boolean") trackPlayerScore = false;
  @type("string") playerScoreType = "kills";

  @type("number") redScore = 0;
  @type("number") blueScore = 0;

  @type("number") timeLimit = 1000 * 15; //1000 * 60 * 5; // 5m
  @type("number") roundStartsIn = 1000 * 5; // 5 seconds

  @type("string") roundStartsAt: string;
  @type("string") roundEndsAt: string;
  @type("boolean") roundActive = false;
  @type("boolean") waitingForPlayers = true;
  @type("boolean") waitingToStart = false;

  setRoundStartsAt() {
    const now = Date.now(); // Current timestamp in milliseconds
    const roundStartTime = new Date(now + this.roundStartsIn); // Add timeLimit to the current time
    this.roundStartsAt = roundStartTime.toISOString(); // Convert to ISO 8601 string
  }

  setRoundEndsAt() {
    const now = Date.now(); // Current timestamp in milliseconds
    const roundEndTime = new Date(now + this.timeLimit); // Add timeLimit to the current time
    this.roundEndsAt = roundEndTime.toISOString(); // Convert to ISO 8601 string
  }
}
