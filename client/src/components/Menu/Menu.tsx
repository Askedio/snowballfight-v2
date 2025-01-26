import { useState, useEffect } from "react";
import { useColyseusRoom, useColyseusState } from "../../lib/colyseus";
import "./Menu.css";

export function Menu() {
  const room = useColyseusRoom();

  

  const state = useColyseusState(); // Get the entire room state

  

  const player = state?.players?.get(room?.sessionId); // Get the current player's state

  // Default values in case player data is not available yet
  const [kills, setKills] = useState(player?.kills || 0);
  const [deaths, setDeaths] = useState(player?.deaths || 0);

  // Re-fetch player data when it changes
  useEffect(() => {
    if (player) {
      setKills(player.kills || 0);
      setDeaths(player.deaths || 0);
    }
  }, [player]);

  const {
    waitingToStart,
    waitingForPlayers,
    redScore = 0,
    blueScore = 0,
    roundStartsAt,
    roundEndsAt,
  } = state || {};

  const [roundTime, setRoundTime] = useState<string>("");

  // Update round time based on state
  useEffect(() => {
    if (waitingForPlayers || waitingToStart) {
      setRoundTime("Waiting for players to be ready...");
    } else if (roundStartsAt) {
      const endTime = new Date(roundStartsAt).getTime();
      const now = Date.now();
      const timeLeft = endTime - now;

      if (timeLeft <= 0) {
        setRoundTime("NOW!");
      } else {
        const seconds = Math.floor(timeLeft / 1000);
        const formattedTime = `Starts in ${String(seconds)}...`;

        if (seconds === 0) {
          setRoundTime("NOW!");
        } else {
          setRoundTime(formattedTime);
        }
      }
    } else if (roundEndsAt) {
      const endTime = new Date(roundEndsAt).getTime();
      const now = Date.now();
      const timeLeft = endTime - now;

      if (timeLeft <= 0) {
        setRoundTime("00:00");
      } else {
        const minutes = Math.floor(timeLeft / 1000 / 60);
        const seconds = Math.floor((timeLeft / 1000) % 60);
        const formattedTime = `${String(minutes)}:${String(seconds).padStart(
          2,
          "0"
        )}`;
        setRoundTime(formattedTime);
      }
    }
  }, [waitingForPlayers, waitingToStart, roundStartsAt, roundEndsAt]);

 
  if (!state || !player) {
    return null;
  }

  return (
    <div className="menu">
      {waitingForPlayers || waitingToStart ? (
        <div id="player-ready" className="show">
          Player ready
        </div>
      ) : null}

      <div className="menu-player-stats">
        <div className="team-player-stats">
          score <span className="active-player-score">0</span>
        </div>
        <div>
          kills <span className="active-player-kills">{kills}</span>
        </div>
        <div>
          deaths <span className="active-player-deaths">{deaths}</span>
        </div>
      </div>

      <div className="menu-team-stats">
        <div className="team-red">
          <span className="team-red-stats">{redScore}</span>
        </div>
        <div className="team-blue">
          <span className="team-blue-stats">{blueScore}</span>
        </div>
      </div>

      <div className="menu-round-time">{roundTime}</div>
    </div>
  );
}
