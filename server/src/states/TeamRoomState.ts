import { type } from "@colyseus/schema";
import { BaseRoomState } from "./BaseRoomState";

export class TeamRoomState extends BaseRoomState {
  showRespawnScreenOnDeath = false;
  teamScoring = true;
  requiresReady = true;
  waitingForPlayers = true;

  @type("boolean") trackPlayerScore = false;
}
