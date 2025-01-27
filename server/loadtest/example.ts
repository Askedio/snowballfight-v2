import { Client } from "colyseus.js";
import type { Room } from "colyseus.js";
import { cli, type Options } from "@colyseus/loadtest";

async function main(options: Options) {
  const client = new Client(options.endpoint);
  const room: Room = await client.joinOrCreate(options.roomName, {});
 
  // room.send("respawn");

  console.log("joined successfully!");

  room.onMessage("*", (type, message) => {
    console.log("onMessage:", type, message);
  });

  room.onStateChange((state) => {
    console.log(room.sessionId, "new state:", state);
  });

  room.onError((err: any) => {
    console.log(room.sessionId, "!! ERROR !!", err.message);
  });

  room.onLeave((code) => {
    console.log(room.sessionId, "left.");
  });
}

cli(main);
