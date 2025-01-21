import { Command } from "@colyseus/command";
import type { Part4Room } from "../rooms/Part4Room";
import type { Client } from "colyseus";

export class OnLeaveCommand extends Command<
  Part4Room,
  { client: Client }
> {
  execute(payload: this["payload"]) {
    const { client } = payload;

    console.log(client.sessionId, "left!");

    //this.state.players.get(client.sessionId).connected = false;

    //this.state.players.get(client.sessionId).connected = false;

    this.state.players.delete(client.sessionId);
    return;
  }
}
