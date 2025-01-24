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

window.addEventListener("player-rejoin", async (e: any) => {
  game.events.emit("onPlayerRejoin", e);
});

document.getElementById("switch").addEventListener("click", (e: any) => {
  if (["ffa", "ctf", "tdm", "ts"].includes(e.target.id)) {
    if (activeScene === e.target.id) {
      return;
    }

    game.scene.stop(activeScene);
    game.scene.remove(activeScene);
    activeScene = e.target.id;

    // Weird, when injected into the game itself the mouse and movement were broken on scenes after #2 
    switch (activeScene) {
      case "ffa":
        game.scene.add("ffa", CtfScene);
        break;
      case "ctf":
        game.scene.add("ctf", CtfScene);
        break;
      case "tdm":
        game.scene.add("tdm", TdmScene);
        break;
      case "ts":
        game.scene.add("ts", TsScene);
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
  hideJoinModal();
  // Emit an event to rejoin the game
  window.dispatchEvent(new Event("player-rejoin"));
});

window.addEventListener("ready", () => {
  onReady();
});

window.addEventListener("joined", () => {
  onJoined();
});
