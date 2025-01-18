import Phaser from "phaser";

export class BulletManager {
  private scene: Phaser.Scene;
  private bullets: Record<string, Phaser.GameObjects.Arc> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  updateBullets(bullets: { id: string; x: number; y: number }[]) {
    Object.keys(this.bullets).forEach((id) => {
      if (!bullets.find((bullet) => bullet.id === id)) {
        this.bullets[id]?.destroy();
        delete this.bullets[id];
      }
    });

    bullets.forEach((bullet) => {
      if (!this.bullets[bullet.id]) {
        this.bullets[bullet.id] = this.scene.add.circle(bullet.x, bullet.y, 2, 0xff0000);
      } else {
        this.bullets[bullet.id].setPosition(bullet.x, bullet.y);
      }
    });
  }
}
