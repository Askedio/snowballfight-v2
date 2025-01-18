import { PlayerManager } from "./PlayerManager";
import { io } from "socket.io-client";

const socket = io("https://server.willbowman.dev");

export class InputHandler {
  private scene: Phaser.Scene;
  private playerManager: PlayerManager;

  constructor(scene: Phaser.Scene, playerManager: PlayerManager) {
    this.scene = scene;
    this.playerManager = playerManager;
  }

  setupListeners() {
    const cursors = this.scene.input.keyboard?.createCursorKeys();
    const wasd = {
      W: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Add keyboard listeners
    this.scene.input.keyboard.on("keydown", (event: KeyboardEvent) => {
      this.handleInput(event, true);
    });

    this.scene.input.keyboard.on("keyup", (event: KeyboardEvent) => {
      this.handleInput(event, false);
    });

    // Add blur listener
    window.addEventListener("blur", () => {
      socket.emit("clearInputs");
    });

    // Add mouse listener for shooting
    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const myPlayer = this.playerManager.getPlayer(socket.id); // Get player from PlayerManager
      if (myPlayer) {
        const dx = pointer.x - myPlayer.x;
        const dy = pointer.y - myPlayer.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        socket.emit("shootBullet", { dx: (dx / magnitude) * 10, dy: (dy / magnitude) * 10 });
      }
    });
  }

  handleInput(event: KeyboardEvent, isActive: boolean) {
    const actionMap = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      w: "up",
      a: "left",
      s: "down",
      d: "right",
    };

    const action = actionMap[event.key];
    if (action) {
      socket.emit("input", { action, isActive });
    }
  }
}
