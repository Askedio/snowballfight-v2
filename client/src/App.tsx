import { useEffect, useLayoutEffect, useState } from "react";
import { FreeForAllScene } from "./scenes/FreeForAllScene";
import { EventBus } from "./EventBus";
import { Loading } from "./components/Loading/Loading";
import { SpawnScreen } from "./components/SpawnScreen/SpawnScreen";

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
  const [isBooted, setIsBooted] = useState(false);
  useLayoutEffect(() => {
    const game = new Phaser.Game(config);
    setIsBooted(true);
  }, []);


  console.log(process.env.BACKEND_URL)
  
  return (
    <>
      <Loading />
      <SpawnScreen />

      <div id="phaser-game" />
    </>
  );
}
