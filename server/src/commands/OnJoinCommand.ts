import { Command } from "@colyseus/command";
import type { FreeForAllRoom } from "../rooms/FreeForAllRoom";
import type { Client } from "colyseus";

export class OnJoinCommand extends Command<
  FreeForAllRoom,
  { client: Client; options: any }
> {
  execute(payload: this["payload"]) {}
}
