import Phaser from "phaser";
import { PlayerManager } from "./PlayerManager";
import { BulletManager } from "./BulletManager";
import { InputHandler } from "./InputHandler";
import { SocketManager } from "./SocketManager";

export class GameScene extends Phaser.Scene {
  private playerManager!: PlayerManager;
  private bulletManager!: BulletManager;
  private players: Record<string, Phaser.GameObjects.Arc> = {};
  private inputHandler: InputHandler;
  private socketManager!: SocketManager;

  constructor() {
    super({ key: "GameScene" });
    this.playerManager = new PlayerManager(this);

    this.inputHandler = new InputHandler(this, this.playerManager);

  }

  preload() {}

  create() {
    // Initialize components
    this.bulletManager = new BulletManager(this);
    
    this.socketManager = new SocketManager(this, this.playerManager, this.bulletManager);

    // Handle input
    this.inputHandler.setupListeners();
  }

  update(time: number, delta: number) {
    this.playerManager.updateHealthPositions();
  }
}
