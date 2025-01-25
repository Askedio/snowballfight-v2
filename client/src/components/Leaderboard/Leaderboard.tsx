import "./Leaderboard.css"

export function Leaderboard() {
  return (
    <div id="leaderboard">
      <h3>Leaderboard</h3>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Kills</th>
            <th>Deaths</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="leaderboard-body" />
      </table>
    </div>
  );
}
