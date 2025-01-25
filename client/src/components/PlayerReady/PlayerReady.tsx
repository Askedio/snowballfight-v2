import { useState, useEffect } from "react";
import { useColyseusRoom } from "../../lib/colyseus"; // Importing the hook
import "./PlayerReady.css";

export function PlayerReady() {
  const room = useColyseusRoom(); // Hook to get the current room

  const [isReady, setIsReady] = useState(false); // Track if the player is ready

  // Handle "player-ready" button click
  const handleReadyClick = (e: React.MouseEvent) => {
    e.preventDefault();

    const notReady = !isReady;

    if (room) {
      // Send the "player-ready" message to the server with the current state
      room.send("player-ready", { ready: notReady });
    }

    // Toggle ready state and update button text
    setIsReady(!isReady);
  };

  return (
    <div className="player-ready">
      <button
        type="button"
        id="player-ready-button"
        className={`player-ready-button ${isReady ? "" : "not-ready"}`}
        onClick={handleReadyClick}
      >
        {isReady ? "Unready" : "Ready"}
      </button>
    </div>
  );
}
