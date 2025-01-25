import { useEffect, useState } from "react";
import { EventBus } from "../../EventBus";
import "./SpawnScreen.css";

export function SpawnScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    EventBus.on("scene-ready", () => {
      setLoading(false);
    });

    return () => {
      EventBus.removeListener("scene-ready");
    };
  }, []);

  if (loading) {
    return;
  }

  return (
    <div id="join-modal" className="modal">
      <div id="killedBy" />

      <h2 id="modal-title" className="text-2xl font-bold mb-4">
        Welcome to Snowball Fight!
      </h2>
      <p id="modal-message" className="mb-4">
        Click Join Game to play!
      </p>

      <input
        id="player-name"
        type="text"
        placeholder="Player name (optional)"
        className="input-field"
      />
      <input
        id="room-name"
        type="text"
        placeholder="Room name (optional)"
        className="input-field"
      />

      <ul id="switch">
        <li id="ffa" className="activeMode gameMode">
          FFA
        </li>
        <li id="ctf" className="gameMode">
          CTF
        </li>
        <li id="tdm" className="gameMode">
          TDM
        </li>
        <li id="ts" className="gameMode">
          TS
        </li>
      </ul>

      <div id="skins">
        <ul id="skinlist">
          <li>
            <img
              alt=""
              id="playersa"
              src="/assets/images/skins/player/playersa_01.png"
            />
          </li>
          <li>
            <img
              alt=""
              id="playersb"
              src="/assets/images/skins/player/playersb_01.png"
            />
          </li>
          <li>
            <img
              alt=""
              id="playersc"
              src="/assets/images/skins/player/playersc_01.png"
            />
          </li>
          <li>
            <img
              alt=""
              id="playersd"
              src="/assets/images/skins/player/playersd_01.png"
            />
          </li>
        </ul>
      </div>

      <button
        type="button"
        id="join-button"
        className="btn-primary"
        onClick={() => {
          EventBus.emit("onPlayerRejoin", { playerName: "", roomName: "" });
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
