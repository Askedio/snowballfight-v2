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
    return;
  }

  return (
    <div id="round-ended" className="modal">
      <h1>This round is over!</h1>

      <p>Click ready to start the next round!</p>

      <div className="stats">
        <div id="round-ended-red">{scores.redScore}</div>
        <div id="round-ended-blue">{scores.blueScore}</div>
      </div>
    </div>
  );
}
