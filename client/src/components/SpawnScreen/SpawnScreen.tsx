import { useEffect, useState } from "react";
import { EventBus } from "../../lib/EventBus";
import "./SpawnScreen.css";
import { useColyseusRoom } from "../../lib/colyseus";

export function SpawnScreen() {
  const [loading, setLoading] = useState(true);
  const [selectedGameMode, setSelectedGameMode] = useState<string>("ffa");
  const [selectedSkin, setSelectedSkin] = useState<string>("playersa");
  const room = useColyseusRoom();

  useEffect(() => {
    EventBus.on("scene-ready", () => {
      setLoading(false);
    });

    return () => {
      EventBus.removeListener("scene-ready");
    };
  }, []);

  const handleGameModeClick = (mode: string) => {
    setSelectedGameMode(mode);
  };

  const handleSkinClick = (skin: string) => {
    setSelectedSkin(skin);
  };

  if (loading) {
    return null;
  }

  return (
    <div className="modal">
      <div className="killedBy" />

      <h2 className="text-2xl font-bold mb-4">Welcome to Snowball Fight!</h2>
      <p className="mb-4">Click Join Game to play!</p>

      <input
        type="text"
        placeholder="Player name (optional)"
        className="input-field"
      />
      <input
        type="text"
        placeholder="Room name (optional)"
        className="input-field"
      />

      {/* Game Mode Switch */}
      <div className="switch">
        <button
          type="button"
          className={`gameMode ${
            selectedGameMode === "ffa" ? "activeMode" : ""
          }`}
          onClick={() => handleGameModeClick("ffa")}
        >
          FFA
        </button>
        <button
          type="button"
          className={`gameMode ${
            selectedGameMode === "ctf" ? "activeMode" : ""
          }`}
          onClick={() => handleGameModeClick("ctf")}
        >
          CTF
        </button>
        <button
          type="button"
          className={`gameMode ${
            selectedGameMode === "tdm" ? "activeMode" : ""
          }`}
          onClick={() => handleGameModeClick("tdm")}
        >
          TDM
        </button>
        <button
          type="button"
          className={`gameMode ${
            selectedGameMode === "ts" ? "activeMode" : ""
          }`}
          onClick={() => handleGameModeClick("ts")}
        >
          TS
        </button>
      </div>

      {/* Skin Selection */}
      <div className="skins">
        <div className="skinlist">
          <button
            type="button"
            className={selectedSkin === "playersa" ? "active" : ""}
            onClick={() => handleSkinClick("playersa")}
          >
            <img alt="" src="/assets/images/skins/player/playersa_01.png" />
          </button>
          <button
            type="button"
            className={selectedSkin === "playersb" ? "active" : ""}
            onClick={() => handleSkinClick("playersb")}
          >
            <img alt="" src="/assets/images/skins/player/playersb_01.png" />
          </button>
          <button
            type="button"
            className={selectedSkin === "playersc" ? "active" : ""}
            onClick={() => handleSkinClick("playersc")}
          >
            <img alt="" src="/assets/images/skins/player/playersc_01.png" />
          </button>
          <button
            type="button"
            className={selectedSkin === "playersd" ? "active" : ""}
            onClick={() => handleSkinClick("playersd")}
          >
            <img alt="" src="/assets/images/skins/player/playersd_01.png" />
          </button>
        </div>
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          room.send("rejoin", {
            playerName: "",
            roomName: "",
            skin: selectedSkin,
          });
        }}
      >
        Join Game
      </button>

      <p className="instructions">
        <span className="text-white">
          Tip: Use your respawn protection to reload your snowballs!
        </span>
        <br />
        <br />
        Move: WASD/Arrow keys in the direction of your mouse
        <br />
        Shoot: Space or Left Click
        <br />
        Reload: R or Right Click
      </p>
    </div>
  );
}
