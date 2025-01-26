import { useState, useEffect } from "react";
import { useColyseusRoom, useColyseusState } from "../../lib/colyseus"; // Importing the hook
import "./PlayerReady.css";
import { EventBus } from "../../lib/EventBus";

export function PlayerReady() {
  const room = useColyseusRoom();
  const requiresPlayerToReady = useColyseusState(
    (state) => state.requiresPlayerToReady
  );
  const [loading, setLoading] = useState(true);

  const player = useColyseusState((state) =>
    state?.players?.get(room?.sessionId)
  );

  useEffect(() => {
    EventBus.on("scene-ready", () => {
      setLoading(false);
    });

    return () => {
      EventBus.removeListener("scene-ready");
    };
  }, []);

  const [showReadyButton, setShowReadyButton] = useState(false);

  useEffect(() => {
    setShowReadyButton(requiresPlayerToReady);
  }, [requiresPlayerToReady]);

  useEffect(() => {
    if (!room) {
      return;
    }

    room.onMessage("round-started", () => {
      setShowReadyButton(false);
    });

    room.onMessage("round-over", () => {
      setIsReady(false);
      setShowReadyButton(true);
    });
  }, [room]);

  // need more to check find in menu waitingToStart
  const teamScoring = useColyseusState((state) => state.teamScoring);

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

  if (!showReadyButton || loading || !player) {
    return;
  }

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
