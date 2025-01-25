import Phaser from "phaser";

import { FreeForAllScene } from "./scenes/FreeForAllScene";
import { CtfScene } from "./scenes/CtfScene";
import { TdmScene } from "./scenes/TdmScene";
import { TsScene } from "./scenes/TsScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  fps: {
    target: 60,
    forceSetTimeOut: true,
    smoothStep: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#CCE4F0",
  parent: "game-container",
  physics: {
    default: "arcade",
  },
  scene: [FreeForAllScene],
};

const game = new Phaser.Game(config);

let activeScene = "ffa";

const chatInput = document.getElementById("chatSend") as HTMLInputElement;

let disableChat = false;
let canChangeMode = false;
let playerState: any;
let roomState: any;

// Add a mouseleave event listener to the chat input
chatInput.addEventListener("mouseleave", () => {
  if (document.activeElement === chatInput) {
    chatInput.blur(); // Remove focus when the mouse leaves the input
  }
});

document.getElementById("chatSend").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (disableChat) {
      return;
    }

    disableChat = true;

    const chatInput = document.getElementById("chatSend") as HTMLInputElement;
    const message = chatInput.value.trim();
    if (message) {
      game.events.emit("onChatSendMessage", message);

      chatInput.value = "";
    }

    // Re-enable chat after 1 second
    setTimeout(() => {
      disableChat = false;
    }, 1000);

    e.preventDefault();
  }
});

document.getElementById("skinlist").addEventListener("click", (e: any) => {
  if (e.target && e.target.nodeName === "IMG") {
    const active = document.getElementsByClassName("active");
    if (active.length) active[0].className = "";
    const newid = document.getElementById(e.target.id).parentElement;

    newid.className = "active";

    const skin = e.target.id;
    game.events.emit("onSkinChange", skin);
  }
});

window.addEventListener("scene-ready", async (e: any) => {
  console.log("redd")
  canChangeMode = true;
});

// Team modes, round started
window.addEventListener("round-started", () => {
  document.getElementById("player-ready").classList.remove("show");
});

// Team modes, round ended
window.addEventListener("round-over", (event: any) => {
  const button = document.getElementById("player-ready-button");
  button.classList.add("not-ready");
  button.innerHTML = "Ready";

  document.getElementById("round-ended-red").innerHTML = event.detail.redScore;
  document.getElementById("round-ended-blue").innerHTML =
    event.detail.blueScore;

  document.getElementById("round-ended").style.display = "block";
});

window.addEventListener("player-killed", (event: any) => {
  const { killer } = event.detail;

  const joinModal = document.getElementById("join-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalMessage = document.getElementById("modal-message");
  const joinButton = document.getElementById("join-button");

  document.getElementById("killedBy").innerHTML = `Killed By ${killer.name}`;

  modalTitle.textContent = "You Died!";
  modalMessage.textContent = "Rejoin the snowball fight!";
  joinButton.textContent = "Rejoin Game";

  joinModal.classList.add("show");
});

// Player state changed
window.addEventListener("player-state-updated", (event: any) => {
  playerState = event.detail;

  document.getElementById("active-player-kills").innerText = `${
    event.detail.kills || 0
  }`;
  document.getElementById("active-player-deaths").innerText = `${
    event.detail.deaths || 0
  }`;
});

// Room state changed
window.addEventListener("room-state-updated", (event: any) => {
  roomState = event.detail;

  if (event.detail.waitingForPlayers || event.detail.waitingToStart) {
    document.getElementById("player-ready").classList.add("show");
  }

  document.getElementById("team-red-stats").innerText = `${
    event.detail.redScore || 0
  }`;

  document.getElementById("team-blue-stats").innerText = `${
    event.detail.blueScore || 0
  }`;

  //
  if (roomState.waitingForPlayers) {
    document.getElementById("round-time").innerHTML =
      "Waiting for players to be ready...";
  } else if (roomState.roundStartsAt) {
    const endTime = new Date(roomState.roundStartsAt).getTime();
    const now = Date.now(); // Get the current time
    const timeLeft = endTime - now; // Calculate the remaining time in milliseconds

    if (timeLeft <= 0) {
      document.getElementById("round-time").innerHTML = "Now!";
    } else {
      const minutes = Math.floor(timeLeft / 1000 / 60);
      const seconds = Math.floor((timeLeft / 1000) % 60);

      // Format the time as MM:SS
      const formattedTime = `Starts in ${String(seconds)}...`;

      if (seconds === 0) {
        document.getElementById("round-time").innerHTML = "NOW!";
        return;
      }

      document.getElementById("round-time").innerHTML = formattedTime;
    }
  } else if (roomState.roundEndsAt) {
    const endTime = new Date(roomState.roundEndsAt).getTime();
    const now = Date.now(); // Get the current time
    const timeLeft = endTime - now; // Calculate the remaining time in milliseconds

    if (timeLeft <= 0) {
      document.getElementById("round-time").innerHTML = "00:00";
    } else {
      const minutes = Math.floor(timeLeft / 1000 / 60);
      const seconds = Math.floor((timeLeft / 1000) % 60);

      // Format the time as MM:SS
      const formattedTime = `${String(minutes)}:${String(seconds).padStart(
        2,
        "0"
      )}`;

      document.getElementById("round-time").innerHTML = formattedTime;
    }
  }
});

// Update connection status
window.addEventListener("connection-status-changed", (event: any) => {
  document.getElementById("connectionStatusText").innerHTML = event.detail;
});

// Update error
window.addEventListener("on-error", (event: any) => {
  document.getElementById("error").innerHTML = event.detail;
});

window.addEventListener("update-fps", (event: any) => {
  document.getElementById("fps").innerHTML = `FPS: ${event.detail}`;
});

window.addEventListener("chat-message-received", (event: any) => {
  const { playerName, message, timestamp } = event.detail;

  const chatBox = document.getElementById("chatBox") as HTMLUListElement;

  // Add the chat message to the chat box
  const chatItem = document.createElement("li");
  chatItem.textContent = `${playerName}: ${message}`;
  chatBox.appendChild(chatItem);

  // Scroll to the bottom of the chat box
  chatBox.scrollTop = chatBox.scrollHeight;

  // Remove the chat item after 1 minute
  setTimeout(() => {
    chatItem.remove();
  }, 10000);
});

document
  .getElementById("player-ready-button")
  .addEventListener("click", (e: any) => {
    e.preventDefault();

    const notReady = e.target.classList.contains("not-ready");

    game.events.emit("onPlayerReady", notReady);

    document.getElementById("round-ended").style.display = "none";

    if (notReady) {
      e.target.classList.remove("not-ready");
      e.target.innerHTML = "Unready";
    } else {
      e.target.classList.add("not-ready");
      e.target.innerHTML = "Ready";
    }
  });

document.getElementById("switch").addEventListener("click", (e: any) => {
  if (!canChangeMode) {
    return;
  }

  if (["ffa", "ctf", "tdm", "ts"].includes(e.target.id)) {
    if (activeScene === e.target.id) {
      return;
    }

    canChangeMode = false;

    game.scene.stop(activeScene);
    if (activeScene !== "ffa") {
      game.scene.remove(activeScene);
    }
    activeScene = e.target.id;

    const keys = game.scene.keys;

    // Weird, when injected into the game itself the mouse and movement were broken on scenes after #2
    switch (activeScene) {
      case "ffa":
        !keys.ffa && game.scene.add("ffa", CtfScene);
        break;
      case "ctf":
        !keys.ctf && game.scene.add("ctf", CtfScene);
        break;
      case "tdm":
        !keys.ctf && game.scene.add("tdm", TdmScene);
        break;
      case "ts":
        !keys.ts && game.scene.add("ts", TsScene);
        break;
    }

    game.scene.start(activeScene);

    const activeSkin = document.getElementsByClassName("active");
    if (activeSkin.length) {
      game.events.emit("onSkinChange", activeSkin[0].id);
    }

    const active = document.getElementsByClassName("activeMode");
    if (active.length) active[0].className = "";

    const newid = document.getElementById(e.target.id);
    newid.className = "activeMode";
  }
});

window.addEventListener("resize", (event) => {
  game.scale.setGameSize(window.innerWidth, window.innerHeight);
  game.scale.refresh();
});

const joinModal = document.getElementById("join-modal");
const rejoinButton = document.getElementById("join-button");

// Show the modal
function showJoinModal() {
  joinModal.classList.add("show");
}

// Hide the modal
function hideJoinModal() {
  joinModal.classList.remove("show");
}

function onReady() {
  const loading = document.getElementById("loading");
  loading.classList.add("onReady");

  const container = document.getElementById("game-container");
  container.classList.add("show");

  setTimeout(() => {
    showJoinModal();
  }, 400);
}

function onJoined() {
  const chatOnReady = document.getElementById("chatOnReady");
  chatOnReady.classList.add("show");

  const menu = document.getElementById("menu");
  menu.classList.add("show");

  const fps = document.getElementById("fps");
  fps.classList.add("show");
}

// Listen for rejoin button click
rejoinButton.addEventListener("click", () => {
  const playerName = (<HTMLInputElement>(
    document.getElementById("player-name")
  )).value.trim();

  const roomName =
    (<HTMLInputElement>document.getElementById("room-name")).value.trim() ||
    window.location.hash.substring(1);

  game.events.emit("onPlayerRejoin", { playerName, roomName });
});

window.addEventListener("ready", () => {
  onReady();
});

window.addEventListener("client-respawned", () => {
  hideJoinModal();
});

window.addEventListener("joined", () => {
  onJoined();
});

document.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const leaderboard = document.getElementById("leaderboard");
    const leaderboardBody = document.getElementById("leaderboard-body");

    leaderboard.style.display = "block";
    leaderboardBody.innerHTML = ""; // Clear previous content

    if (roomState.players) {
      const players = Array.from(roomState.players.entries()).map(
        ([sessionId, player]: any) => ({
          sessionId,
          name: player.name || "",
          kills: player.kills || 0,
          deaths: player.deaths || 0,
          isDead: player.isDead || false,
        })
      );

      players.forEach((player) => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = player.name || player.sessionId;
        row.appendChild(nameCell);

        const killsCell = document.createElement("td");
        killsCell.textContent = player.kills.toString();
        row.appendChild(killsCell);

        const deathsCell = document.createElement("td");
        deathsCell.textContent = player.deaths.toString();
        row.appendChild(deathsCell);

        const statusCell = document.createElement("td");
        statusCell.textContent = player.isDead ? "Dead" : "Alive";
        row.appendChild(statusCell);

        leaderboardBody.appendChild(row);
      });
    }
  }
});

document.addEventListener("keyup", (event: KeyboardEvent) => {
  if (event.key === "Tab") {
    event.preventDefault();

    const leaderboard = document.getElementById("leaderboard");
    leaderboard.style.display = "none";
  }
});
