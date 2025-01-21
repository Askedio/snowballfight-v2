import { Command } from "@colyseus/command";
import type { Part4Room } from "../rooms/Part4Room";
import type { Client } from "colyseus";

export class OnJoinCommand extends Command<
  Part4Room,
  { client: Client; options: any }
> {
  execute(payload: this["payload"]) {
    const { client, options } = payload;

    console.log("joined", options);
    return;
  }
}
