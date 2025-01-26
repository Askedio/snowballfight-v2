import { useEffect, useLayoutEffect, useState } from "react";
import { FreeForAllScene } from "./scenes/FreeForAllScene";
import { Loading } from "./components/Loading/Loading";
import { SpawnScreen } from "./components/SpawnScreen/SpawnScreen";
import { Chat } from "./components/Chat/Chat";
import {
  connectToColyseus,
  disconnectFromColyseus,
  useColyseusState,
} from "./lib/colyseus";
import { Leaderboard } from "./components/Leaderboard/Leaderboard";
import { Menu } from "./components/Menu/Menu";
import { PlayerReady } from "./components/PlayerReady/PlayerReady";
import { TsScene } from "./scenes/TsScene";
import { TdmScene } from "./scenes/TdmScene";
import { CtfScene } from "./scenes/CtfScene";
import { ErrorDialog } from "./components/ErrorDialog/ErrorDialog";
import { RoundComplete } from "./components/RoundComplete/RoundComplete";
import { useLocation } from "react-router";
import { gameModes } from "./lib/gameModes";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  fps: {
    target: 60,
    forceSetTimeOut: true,
    smoothStep: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#CCE4F0",
  parent: "phaser-game",
  physics: {
    default: "arcade",
  },
  scene: [],
};

export function App() {
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const mode = useColyseusState((state) => state.mode);
  const location = useLocation();

  const [lastScene, setLastScene] = useState("");

  useEffect(() => {
    if (!mode || lastScene === mode) {
      return;
    }

    game.scene.stop(lastScene);
    game.scene.remove(lastScene);

    const keys = game.scene.keys;

    // Weird, when injected into the game itself the mouse and movement were broken on scenes after #2
    switch (mode) {
      case "ffa":
        !keys.ffa && game.scene.add("ffa", FreeForAllScene);
        break;
      case "ctf":
        !keys.ctf && game.scene.add("ctf", CtfScene);
        break;
      case "tdm":
        !keys.tdm && game.scene.add("tdm", TdmScene);
        break;
      case "ts":
        !keys.ts && game.scene.add("ts", TsScene);
        break;
    }

    game.scene.start(mode);
    setLastScene(mode);
  }, [mode]);

  useEffect(() => {
    const local = location.pathname.split("/")[1];
    let gameMode = local;
    if (!gameModes.find((_) => _.value === local)) {
      gameMode = "ffa";
    }

    const customRoomName = window.location.hash
      ? window.location.hash.substring(1)
      : "";

    (async () => {
      await connectToColyseus(
        `${customRoomName ? "user_" : ""}${gameMode}_room`,
        {
          customRoomName,
        }
      );
    })();

    return () => {
      // Disconnect from Colyseus when the component unmounts
      disconnectFromColyseus();
    };
  }, [location.pathname]);

  useLayoutEffect(() => {
    const _game = new Phaser.Game(config);
    setGame(_game);

    // Handle window resize
    const handleResize = () => {
      if (!_game) {
        return;
      }
      _game.scale.setGameSize(window.innerWidth, window.innerHeight);
      _game.scale.refresh();
    };

    // Attach resize event listener
    window.addEventListener("resize", handleResize);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <Menu />
      <Loading />
      <SpawnScreen />
      <Chat />
      <Leaderboard />
      <PlayerReady />
      <ErrorDialog />
      <RoundComplete />
      <div id="phaser-game" />
    </>
  );
}
