import { io } from "socket.io-client";
import { PlayerManager } from "./PlayerManager";
import { BulletManager } from "./BulletManager";

const socket = io("https://server.willbowman.dev");

export class SocketManager {
  private playerManager: PlayerManager;
  private bulletManager: BulletManager;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, playerManager: PlayerManager, bulletManager: BulletManager) {
    this.scene = scene;
    this.playerManager = playerManager;
    this.bulletManager = bulletManager;

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    socket.on("initialize", (data) => {
      Object.keys(data.players).forEach((id) => {
        this.playerManager.addPlayer(id, data.players[id]);
      });
    });

    socket.on("stateUpdate", (data) => {
      Object.keys(data.players).forEach((id) => {
        this.playerManager.updatePlayer(id, data.players[id], this.scene["myPlayerId"], this.scene.tweens);
      });

      this.bulletManager.updateBullets(data.bullets);
    });

    socket.on("playerJoined", (player) => {
      this.playerManager.addPlayer(player.id, player);
    });

    socket.on("playerLeft", (id) => {
      this.playerManager.removePlayer(id);
    });

    socket.on("playerDied", (id) => {
      this.playerManager.removePlayer(id);
    });
  }
}
