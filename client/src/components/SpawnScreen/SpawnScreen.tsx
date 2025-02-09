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
import {
  IoAlertCircleOutline,
  IoVolumeLow,
  IoVolumeMute,
} from "react-icons/io5";
import PickupHelper from "../PickupHelper/PickupHelper";
import { isEmbedded } from "../../lib/discordSDK";
import { PiDiscordLogoFill } from "react-icons/pi";

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
  if (
    ![...gameModes, { value: "test", label: "Test World" }].find(
      (_) => _.value === local
    )
  ) {
    gameMode = "ffa";
  }

  const [spawnState, setSpawnState] = useState<SpawnState>({
    playerName: "",
    roomName: window.location.hash ? window.location.hash.substring(1) : "", // Set room name from URL hash
    skin: "playersa",
    gameMode,
  });

  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waitingForDiscord, setWaitingFOrDiscord] = useState(isEmbedded);
  const [muteAudio, setMuteAudio] = useState(false);
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

    EventBus.on("discord", ({ username, channel, guild_id }) => {
      setSpawnState((prevState) => ({
        ...prevState,
        playerName: username || "",
        roomName: guild_id || "",
      }));
    });

    return () => {
      EventBus.removeListener("scene-ready");
      EventBus.removeListener("discord");
    };
  }, []);

  useEffect(() => {
    if (isEmbedded) {
      setTimeout(() => {
        setWaitingFOrDiscord(false);
      }, 3000);
    }
  }, [isEmbedded]);

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

    room.onMessage("player-exited", () => {
      setScreenLanguage(defaultLanguage);
      setLoading(false);
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

        setDisabled(true);

        setTimeout(() => {
          setDisabled(false);
        }, 500);
      }
    );
  }, [room]);

  useEffect(() => {
    connectToRoom();

    window.history.pushState(
      null,
      "",
      `/${spawnState.gameMode === "ffa" ? "" : spawnState.gameMode}${
        window.location.hash ? `#${window.location.hash.substring(1)}` : ""
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
    if (loading) {
      EventBus.emit("disable-keyboard");
    }
  }, [loading]);

  useEffect(() => {
    const connect = async () => {
      await connectToRoom();
      window.history.pushState(
        null,
        "",
        `/${spawnState.gameMode === "ffa" ? "" : spawnState.gameMode}${
          spawnState.roomName ? `#${spawnState.roomName}` : ""
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

    setTimeout(() => {
      EventBus.emit("enable-keyboard");
    }, 1000);
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
    setSpawnState((prev) => ({
      ...prev,
      roomName: newRoomName.trim().slice(0, 20),
    }));
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
      <div className="hidden md:block absolute -right-[200px] top-1/2 transform -translate-y-1/2">
        <PickupHelper />
      </div>

      {disabled && (
        <div className="bg-black/20 z-50 rounded-lg absolute top-0 bottom-0 left-0 right-0" />
      )}
      {killedBy && <div className="killedBy">Killed by: {killedBy}</div>}

      <h2>{screenLanguage.title}</h2>
      <p className="mb-4 border-b border-gray-600 w-full text-center pb-4">
        {screenLanguage.subTitle}
      </p>

      <input
        name="playerName"
        type="text"
        placeholder="Player name (optional)"
        className="input-field"
        value={spawnState.playerName}
        onChange={handleNameChange}
        maxLength={20}
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
        disabled={!room || respawnDelay > 0 || waitingForDiscord} // Disable if room is unavailable or delay > 0
        onClick={handleJoinButtonClick}
      >
        {respawnDelay > 0
          ? `Can respawn in ${respawnDelay}...`
          : screenLanguage.joinButton}
      </button>

      <div className="flex items-center justify-between w-full mt-3">
        <button
          type="button"
          className="btn-plain"
          onClick={() => setIsRoomModalOpen(true)} // Open modal
        >
          {spawnState.roomName
            ? `Current Room: ${spawnState.roomName}`
            : "Change Room"}
        </button>

        <button
          type="button"
          className="text-xl"
          title={`${muteAudio ? "Un-mute Audio" : "Mute Audio"}`}
          onClick={() => {
            const muted = !muteAudio;
            EventBus.emit("mute-audio", muted);
            setMuteAudio(muted);
          }}
        >
          {muteAudio ? <IoVolumeMute /> : <IoVolumeLow />}
        </button>
      </div>

      <p className="text-white text-xs text-center w-full py-3 border-b border-t mt-3 border-gray-600 flex items-center">
        <IoAlertCircleOutline className="text-2xl mr-2" /> Use respawn
        protection to reload your snowballs!
      </p>

      <div className="created-by">
        <p>
          <a
            href="https://discord.gg/5ByX3WE3"
            target="_blank"
            rel="noreferrer"
            title="Join us on Discord"
            className="hover:text-gray-200"
          >
            <PiDiscordLogoFill size={24} />
          </a>
        </p>

        <p className="text-xs">
          Created by{" "}
          <a href="https://willbowman.dev" target="_blank" rel="noreferrer">
            Will Bowman
          </a>
        </p>
      </div>

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
