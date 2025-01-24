import { Command } from "@colyseus/command";
import type { FreeForAllRoom } from "../rooms/FreeForAllRoom";
import type { Client } from "colyseus";


// When a client joins, we mostly do this in on create with the rejoin listener
export class OnJoinCommand extends Command<
  FreeForAllRoom,
  { client: Client; options: any }
> {
  execute(payload: this["payload"]) {}
}
