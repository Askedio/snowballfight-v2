import { useEffect, useLayoutEffect, useState } from "react";
import { FreeForAllScene } from "./scenes/FreeForAllScene";
import { Loading } from "./components/Loading/Loading";
import { SpawnScreen } from "./components/SpawnScreen/SpawnScreen";
import { Chat } from "./components/Chat/Chat";
import { connectToColyseus, disconnectFromColyseus } from "./lib/colyseus";
import { Leaderboard } from "./components/Leaderboard/Leaderboard";
import { Menu } from "./components/Menu/Menu";
import { PlayerReady } from "./components/PlayerReady/PlayerReady";

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
  scene: [FreeForAllScene],
};

export function App() {
  const [game, setGame] = useState<Phaser.Game | null>(null);

  useEffect(() => {
    // Connect to Colyseus when the component mounts
    (async () => {
      await connectToColyseus("ffa_room", {
        customRoomName: "",
      });
    })();

    return () => {
      // Disconnect from Colyseus when the component unmounts
      disconnectFromColyseus();
    };
  }, []);

  useLayoutEffect(() => {
    const _game = new Phaser.Game(config);
    setGame(_game);

    // Handle window resize
    const handleResize = () => {
      console.log(window.innerHeight, window.innerWidth);
      if (_game) {
        _game.scale.setGameSize(window.innerWidth, window.innerHeight);
        _game.scale.refresh();
      }
    };

    // Attach resize event listener
    window.addEventListener("resize", handleResize);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  console.log(process.env.BACKEND_URL);

  return (
    <>
      <Menu />
      <Loading />
      <SpawnScreen />
      <Chat />
      <Leaderboard />
      <PlayerReady />
      <div id="phaser-game" />
    </>
  );
}
