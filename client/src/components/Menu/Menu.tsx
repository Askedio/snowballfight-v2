import "./Menu.css"

export function Menu() {
  return (
    <div id="menu" className="menu">
      <div id="player-stats">
        <div id="team-player-stats">
          score <span id="active-player-score">0</span>
        </div>
        <div>
          kills <span id="active-player-kills">0</span>
        </div>
        <div>
          deaths <span id="active-player-deaths">0</span>
        </div>
      </div>

      <div id="team-stats">
        <div id="team-red">
          <span id="team-red-stats">0</span>
        </div>
        <div id="team-blue">
          <span id="team-blue-stats">0</span>
        </div>
      </div>

      <div id="round-time" />
    </div>
  );
}
