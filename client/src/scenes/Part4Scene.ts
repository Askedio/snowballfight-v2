import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { Client } from "colyseus.js";
import { BACKEND_URL } from "../backend";

export class Part4Scene extends Phaser.Scene {
  room: Room;

  currentPlayer: Phaser.GameObjects.Image;
  playerEntities: { [sessionId: string]: Phaser.GameObjects.Image } = {};
  playerHealth: { [sessionId: string]: Phaser.GameObjects.Text } = {};
  bulletEntities: { [bulletId: string]: Phaser.GameObjects.Image } = {};

  debugFPS: Phaser.GameObjects.Text;

  cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
  wasdKeys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  inputPayload = {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
    tick: undefined,
  };

  elapsedTime = 0;
  fixedTimeStep = 1000 / 60;
  currentTick = 0;

  canShoot = true;
  shootCooldown = 400;

  constructor() {
    super({ key: "part4" });
  }

  async create() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    const spaceBar = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.debugFPS = this.add.text(4, 4, "", { color: "#ff0000" });

    await this.connect();

    // Space bar for shooting
    spaceBar.on("down", () => {
      if (this.canShoot) {
        this.inputPayload.shoot = true;
        this.room.send("input", this.inputPayload); // Notify the server of shooting
        this.startShootCooldown();
      }
    });

    // Reset shooting on space bar release
    spaceBar.on("up", () => {
      this.inputPayload.shoot = false;
    });

    // Handle player addition
    this.room.state.players.onAdd((player, sessionId) => {
      const entity = this.add.image(player.x, player.y, player.skin);
      entity.setOrigin(0.5, 0.5);
      entity.setVisible(!player.isDead); // Hide if the player is dead

      this.playerEntities[sessionId] = entity;

      this.playerHealth[sessionId] = this.add.text(
        player.x - 15,
        player.y - 30,
        `HP: ${player.health || 100}`,
        { fontSize: "10px", color: "#ffffff" }
      );

      if (sessionId === this.room.sessionId) {
        this.currentPlayer = entity;
      }

      // React to player state changes
      player.onChange(() => {
        const entity = this.playerEntities[sessionId];
        const healthText = this.playerHealth[sessionId];
      
        if (entity) {
          if (player.isDead) {
            // Hide visuals when the player is dead
            entity.setVisible(false);
            healthText?.setVisible(false);
          } else {
            // Show visuals when the player is alive
            entity.setVisible(true);
            healthText?.setVisible(true);
      
            // Update position and rotation
            entity.setPosition(player.x, player.y);
            entity.setRotation(player.rotation);
      
            if (healthText) {
              healthText.setPosition(player.x - 15, player.y - 30);
              healthText.setText(`HP: ${player.health}`);
            }
          }
        }
      
        // Handle death modal for the local player
        if (sessionId === this.room.sessionId && player.isDead) {
          console.log("You have died!");
          this.handlePlayerDeath();
        }
      });
      
    });

    // Listen for player death event from the server
    this.room.onMessage("player-death", (data) => {
      const { sessionId } = data;

      if (sessionId === this.room.sessionId) {
        console.log("You have died!");
        this.handlePlayerDeath();
      } else {
        console.log(`Player ${sessionId} has died.`);
      }
    });

    // Handle player removal
    this.room.state.players.onRemove((player, sessionId) => {
      const entity = this.playerEntities[sessionId];
      if (entity) {
        entity.destroy();
        delete this.playerEntities[sessionId];
      }

      const healthText = this.playerHealth[sessionId];
      if (healthText) {
        healthText.destroy();
        delete this.playerHealth[sessionId];
      }
    });

    // Handle bullet addition
    this.room.state.bullets.onAdd((bullet, bulletId) => {
      // Use an image for the bullet
      const bulletEntity = this.add.image(bullet.x, bullet.y, "snowball");
      bulletEntity.setOrigin(0.5, 0.5);
      this.bulletEntities[bulletId] = bulletEntity;

      // Update bullet position when it changes
      bullet.onChange(() => {
        if (this.bulletEntities[bulletId]) {
          this.bulletEntities[bulletId].setPosition(bullet.x, bullet.y);
        }
      });
    });

    this.room.state.bullets.onRemove((bullet, bulletId) => {
      const bulletEntity = this.bulletEntities[bulletId];
      if (bulletEntity) {
        bulletEntity.destroy();
        delete this.bulletEntities[bulletId];
      }
    });


    // Listen for rejoin event
    window.addEventListener("player-rejoin", () => {
      const deathModal = document.getElementById("death-modal");
      if (deathModal) {
        deathModal.classList.remove("show"); // Hide the modal
      }
      console.log("Sending rejoin request to the server");
      this.room.send("rejoin", {});
    });


    setInterval(() => {
      if (this.room?.state?.players) {
        const players = Array.from(this.room.state.players.entries()).map(
          ([sessionId, player]) => ({
            sessionId,
            x: player.x,
            y: player.y,
            health: player.health,
            kills: player.kills,
            deaths: player.deaths,
            isDead: player.isDead,
          })
        );
        console.log("Players state:", players);
      }
    }, 30000);

  }

  async connect() {
    const connectionStatusText = this.add
      .text(0, 0, "Trying to connect with the server...")
      .setStyle({ color: "#ff0000" })
      .setPadding(4);

    const client = new Client(BACKEND_URL);

    try {
      this.room = await client.joinOrCreate("part4_room", {});

      window.dispatchEvent(new Event("ready"));
      connectionStatusText.destroy();
    } catch (e) {
      connectionStatusText.text = "Could not connect with the server.";
    }
  }

  update(time: number, delta: number): void {
    if (!this.currentPlayer) return;

    this.debugFPS.text = `FPS: ${this.game.loop.actualFps.toFixed(1)}`;

    this.inputPayload.left =
      this.cursorKeys.left.isDown || this.wasdKeys.A.isDown;
    this.inputPayload.right =
      this.cursorKeys.right.isDown || this.wasdKeys.D.isDown;
    this.inputPayload.up = this.cursorKeys.up.isDown || this.wasdKeys.W.isDown;
    this.inputPayload.down =
      this.cursorKeys.down.isDown || this.wasdKeys.S.isDown;

    this.room.send("input", this.inputPayload);
  }

  private handlePlayerDeath() {
    const deathModal = document.getElementById("death-modal");
    console.log("died");
    if (deathModal) {
      deathModal.classList.add("show");
    }
  }

  private startShootCooldown() {
    this.canShoot = false;
    setTimeout(() => {
      this.canShoot = true;
    }, this.shootCooldown);
  }
}
