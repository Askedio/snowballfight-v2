import { useState, useEffect } from "react";
import {
  stateStore,
} from "../../lib/colyseus";
import "./Leaderboard.css";

interface Player {
  sessionId: string;
  name: string;
  kills: number;
  deaths: number;
  isDead: boolean;
}

export function Leaderboard() {
  const [isLeaderboardVisible, setLeaderboardVisible] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);

  // Handle Tab key to toggle leaderboard visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();

        const clients = stateStore.get().players;

        const playersList = Array.from(clients.entries()).map(
          ([sessionId, player]: any) => ({
            sessionId,
            name: player.name || "",
            kills: player.kills || 0,
            deaths: player.deaths || 0,
            isDead: player.isDead || false,
          })
        );

        setPlayers(playersList);

        setLeaderboardVisible(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setLeaderboardVisible(false);
      }
    };

    // Attach event listeners for Tab key
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  if (!isLeaderboardVisible) {
    return;
  }

  return (
    <div className="leaderboard-container z-50">
      <h3 className="leaderboard-title">Leaderboard</h3>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th className="leaderboard-th">Player</th>
            <th className="leaderboard-th">Kills</th>
            <th className="leaderboard-th">Deaths</th>
            <th className="leaderboard-th">Status</th>
          </tr>
        </thead>
        <tbody className="leaderboard-body">
          {players.map((player) => (
            <tr key={player.sessionId} className="leaderboard-row">
              <td className="leaderboard-td">
                {player.name || player.sessionId}
              </td>
              <td className="leaderboard-td">{player.kills}</td>
              <td className="leaderboard-td">{player.deaths}</td>
              <td className="leaderboard-td">
                {player.isDead ? "Dead" : "Alive"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
