import "./RoundComplete.css"

export function RoundComplete() {
  return (
    <div id="round-ended" className="modal">
      <h1>This round is over!</h1>

      <p>Click ready to start the next round!</p>

      <div className="stats">
        <div id="round-ended-red">0</div>
        <div id="round-ended-blue">0</div>
      </div>
    </div>
  );
}
