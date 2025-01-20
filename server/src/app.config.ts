import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { Server } from "colyseus";

/**
 * Import your Room files
 */

import { Part4Room } from "./rooms/Part4Room";

let gameServerRef: Server;

export default config({
  options: {
    devMode: true,
  },

  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */

    gameServer.define("part4_room", Part4Room);

    //
    // keep gameServer reference, so we can
    // call `.simulateLatency()` later through an http route
    //
    gameServerRef = gameServer;
  },

  initializeExpress: (app) => {
    /**
     * Bind your custom express routes here:
     */
    app.get("/", (req, res) => {
      res.send("It's time to kick ass and chew bubblegum!");
    });

    /**
     * Bind @colyseus/monitor
     * It is recommended to protect this route with a password.
     * Read more: https://docs.colyseus.io/tools/monitor/
     */
    app.use("/colyseus", monitor());
  },

  beforeListen: () => {
    /**
     * Before before gameServer.listen() is called.
     */
  },
});
