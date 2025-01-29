import { Command } from "@colyseus/command";
import type { Client } from "colyseus";
import type { BaseRoom } from "../rooms/BaseRoom";
import type { BaseRoomState } from "../states/BaseRoomState";

// When a client joins, we mostly do this in on create with the rejoin listener
export class OnJoinCommand extends Command<
  BaseRoom<BaseRoomState>,
  { client: Client; options: any }
> {
  execute(payload: this["payload"]) {}
}
