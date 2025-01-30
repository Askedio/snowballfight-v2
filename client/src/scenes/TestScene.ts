import { BaseScene } from "./BaseScene";

export class TestScene extends BaseScene {
  roomName = "test_room";
  userRoomName = "test_room";

  // Game configuration
  mode = "test";
  scoring = "kills";
  teams = false;
  debugging = true;

  constructor() {
    super({ key: "test" });
  }

  initMap() {
    try {
      this.add.image(0, 0, "Tileset").setOrigin(0, 0);
      this.cameras.main.setBounds(0, 0, 2240, 1344);
      this.physics.world.setBounds(0, 0, 2240 * 2, 1344 * 2);

      const map = this.make.tilemap({ key: "tilemap" });

      const tileset = map.addTilesetImage("Tileset");

      map.createLayer("base", tileset); // base

      if (this.debugging) {
        const tileWidth = map.tileWidth;
        const tileHeight = map.tileHeight;

        // Get map size
        const mapWidth = map.widthInPixels;
        const mapHeight = map.heightInPixels;

        console.log(mapWidth, mapHeight, tileHeight);

        // Create grid overlay
        const gridGraphics = this.add.graphics();
        gridGraphics.lineStyle(1, 0xffffff, 0.3); // White lines, 30% opacity

        // Draw vertical lines
        for (let x = 0; x <= mapWidth; x += tileWidth) {
          gridGraphics.moveTo(x, 0);
          gridGraphics.lineTo(x, mapHeight);
        }

        // Draw horizontal lines
        for (let x = 0; x < mapWidth; x += tileWidth) {
          for (let y = 0; y < mapHeight; y += tileHeight) {
            // Draw grid lines
            gridGraphics.strokeRect(x, y, tileWidth, tileHeight);
        
            // Add text at the center of each tile
            this.add.text(x + tileWidth / 2, y + tileHeight / 2, `${x}\n${y}`, {
              fontSize: "10px",
              color: "#ffffff",
            }).setOrigin(0.5); // Center the text
          }
        }
        gridGraphics.strokePath();
      }
    } catch (e: any) {
      console.log("failed to initalize map", e);
    }
  }
}
