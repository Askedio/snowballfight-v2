import { useEffect, useState } from "react";
import { EventBus } from "../../lib/EventBus";
import "./SpawnScreen.css";
import {
  connectToColyseus,
  disconnectFromColyseus,
  useColyseusRoom,
} from "../../lib/colyseus";

interface SpawnState {
  playerName: string;
  roomName: string;
  skin: string;
  gameMode: string;
}

/*
i think we want to make room name a seeprate button..
*/

const defaultLanguage = {
  title: "Welcome to Snowball Fight!",
  subTitle: "Click Join Game to play!",
  joinButton: "Join Game",
};

export function SpawnScreen() {
  const room = useColyseusRoom();

  const [spawnState, setSpawnState] = useState<SpawnState>({
    playerName: "",
    roomName: window.location.hash ? window.location.hash.substring(1) : "", // Set room name from URL hash
    skin: "playersa",
    gameMode: "ffa",
  });

  const [loading, setLoading] = useState(true);
  const [killedBy, setKilledBy] = useState<string>("");
  const [lastRoomName, setLastRoomName] = useState<string>("");
  const [lastGameMode, setLastGameMode] = useState<string>(spawnState.gameMode);

  const [screenLanguage, setScreenLanguage] = useState(defaultLanguage);

  useEffect(() => {
    EventBus.on("scene-ready", () => {
      setLoading(false);
    });

    return () => {
      EventBus.removeListener("scene-ready");
    };
  }, []);

  useEffect(() => {
    if (!room) return;

    room.onMessage("client-respawned", ({ sessionId }) => {
      if (sessionId === room.sessionId) {
        setLoading(true);
      }
    });

    room.onMessage("player-death", ({ sessionId, player, killer }) => {
      if (sessionId === room.sessionId) {
        setKilledBy(killer.name);

        setScreenLanguage({
          title: "You Died!",
          subTitle: "Rejoin the snowball fight!",
          joinButton: "Respawn",
        });

        setLoading(false);
      }
    });
  }, [room]);

  useEffect(() => {
    connectToRoom();
  }, [spawnState.gameMode, spawnState.roomName]);

  const connectToRoom = async () => {
    setScreenLanguage(defaultLanguage);

    await disconnectFromColyseus();
    await connectToColyseus(
      `${spawnState.roomName && "user_"}${spawnState.gameMode}_room`,
      {
        customRoomName: spawnState.roomName,
      }
    );
  };

  const handleGameModeClick = async (gameMode: string) => {
    if (lastGameMode === gameMode) {
      return;
    }

    setSpawnState((prevState) => ({
      ...prevState,
      gameMode,
    }));

    setLastGameMode(gameMode);
  };

  const handleJoinButtonClick = async () => {
    setLastRoomName(spawnState.roomName);

    room.send("rejoin", {
      playerName: spawnState.playerName,
      roomName: spawnState.roomName,
      skin: spawnState.skin,
    });
  };

  const handleSkinClick = (skin: string) => {
    setSpawnState((prevState) => ({
      ...prevState,
      skin,
    }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSpawnState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  if (loading) {
    return null;
  }

  return (
    <div className="modal">
      {killedBy && <div className="killedBy">Killed By {killedBy}</div>}

      <h2 className="text-2xl font-bold mb-4">{screenLanguage.title}</h2>
      <p className="mb-4">{screenLanguage.subTitle}</p>

      <input
        name="playerName"
        type="text"
        placeholder="Player name (optional)"
        className="input-field"
        value={spawnState.playerName}
        onChange={handleNameChange}
      />
      <input
        name="roomName"
        type="text"
        placeholder="Room name (optional)"
        className="input-field"
        value={spawnState.roomName}
        onChange={handleNameChange}
      />

      {/* Game Mode Switch */}
      <div className="switch">
        <button
          type="button"
          className={`gameMode ${
            spawnState.gameMode === "ffa" ? "activeMode" : ""
          }`}
          onClick={() => handleGameModeClick("ffa")}
        >
          FFA
        </button>
        <button
          type="button"
          className={`gameMode ${
            spawnState.gameMode === "ctf" ? "activeMode" : ""
          }`}
          onClick={() => handleGameModeClick("ctf")}
        >
          CTF
        </button>
        <button
          type="button"
          className={`gameMode ${
            spawnState.gameMode === "tdm" ? "activeMode" : ""
          }`}
          onClick={() => handleGameModeClick("tdm")}
        >
          TDM
        </button>
        <button
          type="button"
          className={`gameMode ${
            spawnState.gameMode === "ts" ? "activeMode" : ""
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
            className={spawnState.skin === "playersa" ? "active" : ""}
            onClick={() => handleSkinClick("playersa")}
          >
            <img alt="" src="/assets/images/skins/player/playersa_01.png" />
          </button>
          <button
            type="button"
            className={spawnState.skin === "playersb" ? "active" : ""}
            onClick={() => handleSkinClick("playersb")}
          >
            <img alt="" src="/assets/images/skins/player/playersb_01.png" />
          </button>
          <button
            type="button"
            className={spawnState.skin === "playersc" ? "active" : ""}
            onClick={() => handleSkinClick("playersc")}
          >
            <img alt="" src="/assets/images/skins/player/playersc_01.png" />
          </button>
          <button
            type="button"
            className={spawnState.skin === "playersd" ? "active" : ""}
            onClick={() => handleSkinClick("playersd")}
          >
            <img alt="" src="/assets/images/skins/player/playersd_01.png" />
          </button>
        </div>
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={!room}
        onClick={() => handleJoinButtonClick()}
      >
        {screenLanguage.joinButton}
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
