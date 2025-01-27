import { useEffect, useState } from "react";
import "./RoundComplete.css";
import { useColyseusRoom } from "../../lib/colyseus";

export function RoundComplete() {
  const room = useColyseusRoom();
  const [showDialog, setShowDialog] = useState(false);

  const [scores, setScores] = useState({ redScore: 0, blueScore: 0 });

  useEffect(() => {
    if (!room) {
      return;
    }

    room.onMessage("round-started", () => {
      setShowDialog(false);
    });

    room.onMessage("round-over", ({ redScore, blueScore }) => {
      setScores({ redScore, blueScore });
      setShowDialog(true);
    });
  }, [room]);

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
      
       <p>Click ready to start the next round.</p>

    </div>
  );
}
