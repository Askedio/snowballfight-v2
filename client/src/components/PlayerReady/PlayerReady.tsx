import { useState, useEffect } from "react";
import { useColyseusRoom, useColyseusState } from "../../lib/colyseus"; // Importing the hook
import "./PlayerReady.css";
import { EventBus } from "../../lib/EventBus";

export function PlayerReady() {
  const room = useColyseusRoom();
  const requiresReady = useColyseusState((state) => state.requiresReady);

  const roundActive = useColyseusState((state) => state.roundActive);

  const player = useColyseusState((state) =>
    state?.players?.get(room?.sessionId)
  );

  const [loading, setLoading] = useState(true);
  const [showReadyButton, setShowReadyButton] = useState(false);
  const [showWaiting, setShowWaiting] = useState(false);
  const [isReady, setIsReady] = useState(false); // Track if the player is ready

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

    if (roundActive) {
      setShowWaiting(true);
    }
  }, [room, roundActive]);

  useEffect(() => {
    setShowReadyButton(requiresReady && !room?.state?.roundActive);
  }, [requiresReady, room]);

  useEffect(() => {
    if (!room) {
      return;
    }

    room.onMessage("round-started", () => {
      setShowReadyButton(false);
      setShowWaiting(false);
    });

    room.onMessage("round-over", () => {
      setIsReady(false);
      setShowWaiting(false);
      setShowReadyButton(true);
    });
  }, [room]);

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

  if (loading || !player) {
    return;
  }

  return (
    <>
      {showWaiting && !player.canJoin && (
        <div className="player-ready">
          <div className="player-waiting">Waiting for next round...</div>
        </div>
      )}

      {showReadyButton && requiresReady && (
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
      )}
    </>
  );
}
