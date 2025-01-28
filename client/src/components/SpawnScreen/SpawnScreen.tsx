import { useEffect, useState } from "react";
import { EventBus } from "../../lib/EventBus";
import "./SpawnScreen.css";
import {
  connectToColyseus,
  disconnectFromColyseus,
  useColyseusRoom,
} from "../../lib/colyseus";
import { Dropdown } from "../Dropdown/Dropdown";
import { RoomModal } from "../RoomModal/RoomModal";
import { gameModes } from "../../lib/gameModes";
import { skins } from "../../lib/skins";
import { useLocation } from "react-router";

interface SpawnState {
  playerName: string;
  roomName: string;
  skin: string;
  gameMode: string;
}

const defaultLanguage = {
  title: "Welcome to Snowball Fight!",
  subTitle: "Click Join Game to start fighting",
  joinButton: "Join Game",
};

export function SpawnScreen() {
  const room = useColyseusRoom();
  const location = useLocation();
  const [following, setFollowing] = useState(null);

  const local = location.pathname.split("/")[1];
  let gameMode = local;
  if (!gameModes.find((_) => _.value === local)) {
    gameMode = "ffa";
  }

  const [spawnState, setSpawnState] = useState<SpawnState>({
    playerName: "",
    roomName: window.location.hash ? window.location.hash.substring(1) : "", // Set room name from URL hash
    skin: "playersa",
    gameMode,
  });

  const [loading, setLoading] = useState(true);
  const [killedBy, setKilledBy] = useState<string>("");
  const [lastRoomName, setLastRoomName] = useState<string>("");
  const [lastGameMode, setLastGameMode] = useState<string>(spawnState.gameMode);
  const [respawnDelay, setRespawnDelay] = useState<number>(0); // Track respawn delay
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false); // Modal state
  const [connectionOpen, setConnectionOpen] = useState(true); // Modal state
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
    if (!room) {
      return;
    }

    // Handle round-over message
    room.onMessage("round-over", ({ redScore, blueScore }) => {
      if (room.state.mode === "ts") {
        setFollowing("");
        EventBus.emit("follow-player", room.sessionId);
      }
    });
  }, [room]);

  useEffect(() => {
    if (!room) return;

    room.onMessage("client-respawned", ({ sessionId }) => {
      if (sessionId === room.sessionId) {
        setLoading(true);
      }
    });

    room.onMessage(
      "player-death",
      ({ sessionId, player, killer, respawnDelay }) => {
        if (sessionId === room.sessionId && room.state.mode === "ts") {
          setFollowing(killer.name);
          EventBus.emit("follow-player", killer.sessionId);
        }

        if (sessionId === room.sessionId && room.state.mode !== "ts") {
          setKilledBy(killer.name);

          setScreenLanguage({
            title: "You Died!",
            subTitle: "Rejoin the snowball fight!",
            joinButton: "Respawn",
          });

          setRespawnDelay(respawnDelay); // Set the respawn delay

          setLoading(false);
        }
      }
    );
  }, [room]);

  useEffect(() => {
    connectToRoom();

    window.history.pushState(
      null,
      "",
      `/${spawnState.gameMode === "ffa" ? "" : spawnState.gameMode}${
        window.location.hash
      }`
    );
  }, [spawnState.gameMode]);

  // Countdown timer for respawn delay
  useEffect(() => {
    if (respawnDelay > 0) {
      const timer = setInterval(() => {
        setRespawnDelay((prev) => Math.max(prev - 1, 0)); // Decrement delay
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [respawnDelay]);

  useEffect(() => {
    if (!spawnState.roomName) return;
    const connect = async () => {
      await connectToRoom();
      window.history.pushState(
        null,
        "",
        `/${spawnState.gameMode === "ffa" ? "" : spawnState.gameMode}#${
          spawnState.roomName
        }`
      );
      EventBus.emit("change-room", { mode: spawnState.gameMode });
    };
    connect();
  }, [spawnState.roomName]);

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

  const handleJoinButtonClick = async () => {
    setLastRoomName(spawnState.roomName);

    if (!room.connection.isOpen) {
      setConnectionOpen(false);
    }

    room.send("respawn", {
      playerName: spawnState.playerName,
      roomName: spawnState.roomName,
      skin: spawnState.skin,
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSpawnState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleGameModeChange = (gameMode: string) => {
    if (lastGameMode === gameMode) {
      return;
    }

    setSpawnState((prev) => ({ ...prev, gameMode }));
    setLastGameMode(gameMode);
  };

  const handleSkinChange = (skin: string) => {
    setSpawnState((prev) => ({ ...prev, skin }));
  };

  const handleRoomChange = (newRoomName: string) => {
    setSpawnState((prev) => ({ ...prev, roomName: newRoomName }));
  };

  if (following) {
    return <div className="following">Following {following}</div>;
  }

  if (loading) {
    return null;
  }

  if (!connectionOpen) {
    return (
      <div className="modal text-center">
        <h1 className="text-xl">
          Sorry, there is a problem with connecting to the servers.
        </h1>
        <br />
        <br />
        Try reloading your browser window.
      </div>
    );
  }

  return (
    <div className="modal z-30">
      {killedBy && <div className="killedBy">Killed by: {killedBy}</div>}

      <h2>{screenLanguage.title}</h2>
      <p className="mb-4 border-b border-gray-600 w-full text-center pb-4">{screenLanguage.subTitle}</p>

      <input
        name="playerName"
        type="text"
        placeholder="Player name (optional)"
        className="input-field"
        value={spawnState.playerName}
        onChange={handleNameChange}
      />

      <div className="flex items-center gap-6 w-full mb-4">
        <Dropdown
          options={gameModes}
          selected={spawnState.gameMode}
          onChange={handleGameModeChange}
        />

        {spawnState.gameMode === "ffa" && (
          <div className="w-32">
            <Dropdown
              options={skins}
              selected={spawnState.skin}
              onChange={handleSkinChange}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={!room || respawnDelay > 0} // Disable if room is unavailable or delay > 0
        onClick={handleJoinButtonClick}
      >
        {respawnDelay > 0
          ? `Can respawn in ${respawnDelay}...`
          : screenLanguage.joinButton}
      </button>

      <button
        type="button"
        className="mt-3 btn-plain"
        onClick={() => setIsRoomModalOpen(true)} // Open modal
      >
        {spawnState.roomName
          ? `Current Room: ${spawnState.roomName}`
          : "Change Room"}
      </button>

      <div className="instructions">
        <p className="text-white text-center w-full pb-3 border-b border-gray-600">
          <strong>Tip:</strong> Use your respawn protection to reload your
          snowballs!
        </p>
        Move: WASD/Arrow keys in the direction of your mouse
        <br />
        Shoot: Space or Left Click
        <br />
        Reload: R or Right Click
      </div>

      <p className="created-by">
        Created by{" "}
        <a href="https://willbowman.dev" target="_blank" rel="noreferrer">
          Will Bowman
        </a>
      </p>

      {isRoomModalOpen && (
        <RoomModal
          currentRoom={spawnState.roomName}
          onChangeRoom={handleRoomChange}
          onClose={() => setIsRoomModalOpen(false)} // Close modal
        />
      )}
    </div>
  );
}
