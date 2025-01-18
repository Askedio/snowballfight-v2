import Phaser from "phaser";

export class PlayerManager {
  private scene: Phaser.Scene;
  private players: Record<string, Phaser.GameObjects.Arc> = {};
  private playerHealth: Record<string, Phaser.GameObjects.Text> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  getPlayer(id: string): Phaser.GameObjects.Arc | null {
    return this.players[id] || null;
  }

  addPlayer(id: string, player: { x: number; y: number; health: number }) {
    this.players[id] = this.scene.add.circle(player.x, player.y, 10, 0x00ff00);
    this.playerHealth[id] = this.scene.add.text(player.x - 15, player.y - 20, `HP: ${player.health}`, {
      fontSize: "10px",
      color: "#ffffff",
    });
  }

  removePlayer(id: string) {
    this.players[id]?.destroy();
    delete this.players[id];

    this.playerHealth[id]?.destroy();
    delete this.playerHealth[id];
  }

  updatePlayer(
    id: string,
    player: { x: number; y: number; health: number },
    myPlayerId: string | null,
    tweens: Phaser.Tweens.TweenManager
  ) {
    const current = this.players[id];

    if (!current) return;

    if (id !== myPlayerId) {
      // Interpolate remote player positions
      tweens.add({
        targets: current,
        x: player.x,
        y: player.y,
        duration: 10,
      });
    }

    const healthText = this.playerHealth[id];
    if (healthText) {
      healthText.setText(`HP: ${player.health}`);
    }
  }

  updateHealthPositions() {
    Object.keys(this.players).forEach((id) => {
      const player = this.players[id];
      const healthText = this.playerHealth[id];
      if (player && healthText) {
        healthText.x = player.x - 15;
        healthText.y = player.y - 20;
      }
    });
  }
}
