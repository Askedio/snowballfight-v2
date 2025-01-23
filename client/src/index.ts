import Phaser from "phaser";

import { FreeForAllScene } from "./scenes/FreeForAllScene";
import { CtfScene } from "./scenes/CtfScene";

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
  scene: [FreeForAllScene, CtfScene],
};

const game = new Phaser.Game(config);

window.addEventListener("resize", (event) => {
  game.scale.setGameSize(window.innerWidth, window.innerHeight);
  game.scale.refresh();
});

// JavaScript to handle modal
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
  }, 900);
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
