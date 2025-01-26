import { useState, useEffect } from "react";
import { useColyseusRoom, useColyseusState } from "../../lib/colyseus";
import "./Menu.css";

export function Menu() {
  const room = useColyseusRoom();

  const state = useColyseusState(); // Get the entire room state

  const player = useColyseusState((state) =>
    state?.players?.get(room?.sessionId)
  );

  // Default values in case player data is not available yet
  const [kills, setKills] = useState(player?.kills || 0);
  const [deaths, setDeaths] = useState(player?.deaths || 0);

  // Re-fetch player data when it changes
  useEffect(() => {
    if (player) {
      setKills(player.kills || 0);
      setDeaths(player.deaths || 0);
    }
  }, [player?.kills, player?.deaths]);

  const {
    waitingToStart,
    waitingForPlayers,
    redScore = 0,
    blueScore = 0,
    roundStartsAt,
    roundEndsAt,
    teamScoring,
  } = state || {};

  const [roundTime, setRoundTime] = useState<string>("");

  // Update round time at regular intervals
  useEffect(() => {
    const updateRoundTime = () => {
      if (waitingForPlayers) {
        setRoundTime("Waiting for players to be ready...");
      } else if (waitingToStart && roundStartsAt) {
        const endTime = new Date(roundStartsAt).getTime(); // Ensure this gets a valid timestamp
        const now = Date.now();
        const timeLeft = endTime - now;
        const seconds = Math.ceil(timeLeft / 1000);
    
        if (seconds <= 0) {
          setRoundTime("NOW!");
        } else {
          setRoundTime(`Starts in ${seconds}...`);
        }
      } else if (roundEndsAt) {
        const endTime = new Date(roundEndsAt).getTime(); // Ensure this gets a valid timestamp
        const now = Date.now();
        const timeLeft = endTime - now;
    
        if (timeLeft <= 0) {
          setRoundTime("00:00");
        } else {
          const minutes = Math.floor(timeLeft / 1000 / 60);
          const seconds = Math.ceil((timeLeft / 1000) % 60);
          setRoundTime(
            `${String(minutes)}:${String(seconds).padStart(2, "0")}`
          );
        }
      }
    };
    

    // Update time immediately and then at regular intervals
    updateRoundTime();
    const interval = setInterval(updateRoundTime, 1000);

    return () => clearInterval(interval); // Cleanup on unmount or dependency change
  }, [waitingForPlayers, waitingToStart, roundStartsAt, roundEndsAt]);

  if (!state || !player) {
    return null;
  }

  return (
    <div className="menu">
      <div className="menu-player-stats">
        {teamScoring && (
          <div className="team-player-stats">
            score <span className="active-player-score">0</span>
          </div>
        )}
        <div>
          kills <span className="active-player-kills">{kills}</span>
        </div>
        <div>
          deaths <span className="active-player-deaths">{deaths}</span>
        </div>
      </div>

      {teamScoring && (
        <>
          <div className="menu-team-stats">
            <div className="team-red">
              <span className="team-red-stats">{redScore}</span>
            </div>
            <div className="team-blue">
              <span className="team-blue-stats">{blueScore}</span>
            </div>
          </div>

          <div className="menu-round-time">{roundTime}</div>
        </>
      )}
    </div>
  );
}
