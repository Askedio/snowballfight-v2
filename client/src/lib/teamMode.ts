export function setTeamModeMenu(display = false, mode = "ffa") {
  document.getElementById("team-player-stats").style.display =
    display && mode === "ctf" ? "flex" : "none";

  document.getElementById("team-stats").style.display = display
    ? "flex"
    : "none";

  document.getElementById("active-player-score").innerHTML = "0";
  document.getElementById("team-red-stats").innerHTML = "0";
  document.getElementById("team-blue-stats").innerHTML = "0";
}
