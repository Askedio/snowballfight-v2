import { useEffect, useState } from "react";
import "./RoundComplete.css";
import { useColyseusRoom, useColyseusState } from "../../lib/colyseus";
import { skins } from "../../lib/skins";

export function RoundComplete() {
  const room = useColyseusRoom();
  const [showDialog, setShowDialog] = useState(false);
  const players = useColyseusState((state) => state.players);

  const [scores, setScores] = useState({ redScore: 0, blueScore: 0 });
  const [playerStats, setPlayerStats] = useState({
    topScorer: null,
    topKiller: null,
    topDeaths: null,
  });

  useEffect(() => {
    if (!room) {
      return;
    }

    // Handle round-started message
    room.onMessage("round-started", () => {
      setShowDialog(false);
    });

    // Handle round-over message
    room.onMessage("round-over", ({ redScore, blueScore }) => {
      setScores({ redScore, blueScore });
      setShowDialog(true);

      // Process player stats
      const stats = getPlayerStats(players);
      setPlayerStats(stats);
    });
  }, [room, players]);

  const getSkinImage = (skinValue = "playersa") => {
    console.log(skinValue)
    const skin = skins.find((s) => s.value === skinValue);
    return skin ? skin.image : null;
  };

  const getPlayerStats = (players) => {
    let topScorer = null;
    let topKiller = null;
    let topDeaths = null;

    players?.forEach((player) => {
      if (!topScorer || player.score > (topScorer?.score || 0)) {
        topScorer = player;
      }
      if (!topKiller || player.kills > (topKiller?.kills || 0)) {
        topKiller = player;
      }
      if (!topDeaths || player.deaths > (topDeaths?.deaths || 0)) {
        topDeaths = player;
      }
    });

    return {
      topScorer: topScorer
        ? { name: topScorer.name, score: topScorer.score }
        : null,
      topKiller: topKiller
        ? { name: topKiller.name, kills: topKiller.kills }
        : null,
      topDeaths: topDeaths
        ? { name: topDeaths.name, deaths: topDeaths.deaths }
        : null,
    };
  };

  if (!showDialog) {
    return null;
  }

  return (
    <div className="round-ended modal">
      <h1>This round is over!</h1>

      {scores.redScore === scores.blueScore && <div>Draw</div>}
      {scores.redScore > scores.blueScore && <div>Red Wins</div>}
      {scores.redScore < scores.blueScore && <div>Blue Wins</div>}

      <div className="stats">
        <div className="round-ended-red">{scores.redScore}</div>
        to
        <div className="round-ended-blue">{scores.blueScore}</div>
      </div>

      <div className="player-stats">
        {playerStats.topScorer && (
          <div>
            <h3>Top Scorer</h3>
            <img
              src={getSkinImage(playerStats.topScorer.skin)}
              alt={`${playerStats.topScorer.name}'s skin`}
              className="player-skin"
            />
            <div>
              {playerStats.topScorer.name} ({playerStats.topScorer.score})
            </div>
          </div>
        )}
        {playerStats.topKiller && (
          <div>
            <h3>Most Kills</h3>
            <img
              src={getSkinImage(playerStats.topKiller.skin)}
              alt={`${playerStats.topKiller.name}'s skin`}
              className="player-skin"
            />
            <div>
              {playerStats.topKiller.name} ({playerStats.topKiller.kills})
            </div>
          </div>
        )}
        {playerStats.topDeaths && (
          <div>
            <h3>Most Deaths</h3>
            <img
              src={getSkinImage(playerStats.topDeaths.skin)}
              alt={`${playerStats.topDeaths.name}'s skin`}
              className="player-skin"
            />
            <div>
              {playerStats.topDeaths.name} ({playerStats.topDeaths.deaths})
            </div>
          </div>
        )}
      </div>

      <p>Click ready to start the next round.</p>
    </div>
  );
}
