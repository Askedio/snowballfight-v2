import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import type { Server } from "colyseus";

/**
 * Import your Room files
 */

import { FreeForAllRoom } from "./rooms/FreeForAllRoom";
import { CtfRoom } from "./rooms/CtfRoom";
import { TdmRoom } from "./rooms/TdmRoom";
import { TsRoom } from "./rooms/TsRoom";
import express from "express";
import path from "node:path";
const router = express.Router();

import basicAuth from "express-basic-auth";
import { TestRoom } from "./rooms/TestRoom";

const basicAuthMiddleware = basicAuth({
  // list of users and passwords
  users: {
    gcphost: "tical",
    chris: "isreallycool",
  },
  // sends WWW-Authenticate header, which will prompt the user to fill
  // credentials in
  challenge: true,
});

let gameServerRef: Server;

export default config({
  options: {
    devMode: process.env.NODE_ENV === "development",
  },

  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */

    gameServer.define("ffa_room", FreeForAllRoom);
    gameServer
      .define("user_ffa_room", FreeForAllRoom)
      .filterBy(["customRoomName"]);

    gameServer.define("test_room", TestRoom);
    gameServer.define("user_test_room", TestRoom).filterBy(["customRoomName"]);

    gameServer.define("ctf_room", CtfRoom);
    gameServer.define("user_ctf_room", CtfRoom).filterBy(["customRoomName"]);

    gameServer.define("tdm_room", TdmRoom);
    gameServer.define("user_tdm_room", TdmRoom).filterBy(["customRoomName"]);

    gameServer.define("ts_room", TsRoom);
    gameServer.define("user_ts_room", TsRoom).filterBy(["customRoomName"]);

    //
    // keep gameServer reference, so we can
    // call `.simulateLatency()` later through an http route
    //
    gameServerRef = gameServer;
  },

  initializeExpress: (app) => {
    app.use(express.json());
    app.use(router);

    console.log(process.env.VITE_CLIENT_ID);

    app.use("/colyseus", basicAuthMiddleware, monitor());

    router.post("/api/token", async (req, res) => {
      const response = await fetch(`https://discord.com/api/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.VITE_CLIENT_ID,
          client_secret: process.env.DISCORD_SECRET,
          grant_type: "authorization_code",
          code: req.body.code,
        }),
      });

      const { access_token } = (await response.json()) as {
        access_token: string;
      };

      res.send({ access_token });
    });

    app.use("/.proxy/api", router);

    const clientBuildPath = path.join(__dirname, "../../client/dist");
    app.use(express.static(clientBuildPath));
    app.use("/.proxy/assets", express.static(clientBuildPath + "/assets"));

    app.get("*", function (req, res) {
      res.sendFile("index.html", {
        root: path.join(__dirname, "../../client/dist/"),
      });
    });
  },

  beforeListen: () => {},
});
