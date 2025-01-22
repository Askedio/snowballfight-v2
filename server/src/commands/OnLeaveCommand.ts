import { Command } from "@colyseus/command";
import type { FreeForAllRoom } from "../rooms/FreeForAllRoom";
import type { Client } from "colyseus";

export class OnLeaveCommand extends Command<
  FreeForAllRoom,
  { client: Client }
> {
  execute(payload: this["payload"]) {
    const { client } = payload;

    console.log(client.sessionId, "left!");

    this.state.players.delete(client.sessionId);
    return;
  }
}
