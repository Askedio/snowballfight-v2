import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { Client } from "colyseus.js";
import { BACKEND_URL } from "../backend";

export class Part4Scene extends Phaser.Scene {
  room: Room;

  currentPlayer: Phaser.GameObjects.Container;
  playerEntities: { [sessionId: string]: Phaser.GameObjects.Container } = {};
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

  preload() {
    this.load.atlas(
      "players",
      "assets/sprites/players.png",
      "assets/sprites/players.json"
    );

    // load the PNG file
    this.load.image("Tileset", "assets/maps/winter/map.png");

    // load the JSON file
    this.load.tilemapTiledJSON("tilemap", "assets/maps/winter/map.json");
  }

  async create() {
    this.debugFPS = this.add.text(4, 4, "", { color: "#ff0000" });
    
    this.add.image(0, 0, "Tileset").setOrigin(0, 0);
    this.cameras.main.setBounds(0, 0, 2240, 1344);
    this.physics.world.setBounds(0, 0, 2240 * 2, 1344 * 2);

    const map = this.make.tilemap({ key: "tilemap" });

    const tileset = map.addTilesetImage("Tileset");

    map.createLayer("base", tileset);

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

    const tabKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.TAB
    );
    tabKey.on("down", this.showLeaderboard.bind(this));
    tabKey.on("up", this.hideLeaderboard.bind(this));

   


    await this.connect();

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

    setInterval(() => {
      this.updatePlayerStats();
    }, 1000);

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

    this.createAnimations();

    // Handle player addition
    this.room.state.players.onAdd((player, sessionId) => {
      const playerSprite = this.add.sprite(
        0,
        0,
        "players",
        `${player.skin}_01.png`
      );

      const playerHealthText = this.add.text(
        0, // X relative to the container
        -30, // Y above the sprite
        `HP: ${player.health || 100}`,
        { fontSize: "10px", color: "#ffffff" }
      );

      playerSprite.setOrigin(0.5, 0.5); // Centered
      playerHealthText.setOrigin(0.5, 0.5); // Centered

      // Add both to a container
      const playerContainer = this.add.container(player.x, player.y, [
        playerSprite,
        playerHealthText,
      ]);

      // Optionally set size (useful for debugging)
      playerContainer.setSize(playerSprite.width, playerSprite.height);

      this.playerEntities[sessionId] = playerContainer;
      this.playerHealth[sessionId] = playerHealthText;

      if (sessionId === this.room.sessionId) {
        this.currentPlayer = playerContainer;
        this.cameras.main.startFollow(this.currentPlayer, true);
      }

      // React to player state changes
      player.onChange(() => {
        const container = this.playerEntities[
          sessionId
        ] as Phaser.GameObjects.Container;
        const sprite = container.list.find(
          (item) => item instanceof Phaser.GameObjects.Sprite
        ) as Phaser.GameObjects.Sprite;
        const healthText = container.list.find(
          (item) => item instanceof Phaser.GameObjects.Text
        ) as Phaser.GameObjects.Text;

        if (container) {
          container.setPosition(player.x, player.y);

          if (player.isDead) {
            container.setVisible(false);
          } else {
            container.setVisible(true);

            this.tweens.add({
              targets: container,
              x: player.x,
              y: player.y,
              duration: 100,
              ease: "Linear",
            });

            sprite.setRotation(player.rotation);

            if (player.isMoving) {
              if (
                sprite.anims.currentAnim?.key !== `${player.skin}_walk` ||
                !sprite.anims.isPlaying
              ) {
                sprite.play(`${player.skin}_walk`, true);
              }
            } else {
              if (sprite.anims.isPlaying) {
                sprite.stop();
                sprite.setTexture("players", `${player.skin}_01.png`);
              }
            }

            healthText.setText(`HP: ${player.health}`);
          }
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
      const container = this.playerEntities[sessionId];
      if (container) {
        container.destroy();
        delete this.playerEntities[sessionId];
      }
    });

    // Handle bullet addition
    this.room.state.bullets.onAdd((bullet, bulletId) => {
      const bulletEntity = this.add.image(bullet.x, bullet.y, "snowball");
      bulletEntity.setOrigin(0.5, 0.5);
      this.bulletEntities[bulletId] = bulletEntity;

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

    window.addEventListener("player-rejoin", () => {
      const deathModal = document.getElementById("death-modal");
      if (deathModal) {
        deathModal.classList.remove("show");
      }
      console.log("Sending rejoin request to the server");
      this.room.send("rejoin", {});
    });
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

  updatePlayerStats() {
    if (!this.room?.state?.players) return;

    const player = this.room.state.players.get(this.room.sessionId);
    if (player) {
      document.getElementById(
        "active-player-kills"
      ).innerText = `Kills: ${player.kills}`;
      document.getElementById(
        "active-player-deaths"
      ).innerText = `Deaths: ${player.deaths}`;
    }
  }

  showLeaderboard() {
    const leaderboard = document.getElementById("leaderboard");
    const leaderboardBody = document.getElementById("leaderboard-body");

    leaderboard.style.display = "block";
    leaderboardBody.innerHTML = ""; // Clear previous content

    const players = Array.from(this.room.state.players.entries()).map(
      ([sessionId, player]) => ({
        sessionId,
        kills: player.kills,
        deaths: player.deaths,
        isDead: player.isDead,
      })
    );

    players.forEach((player) => {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.textContent = player.sessionId;
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

  hideLeaderboard() {
    const leaderboard = document.getElementById("leaderboard");
    leaderboard.style.display = "none";
  }

  createAnimations() {
    const skins = ["playersa", "playersb", "playersc", "playersd"];

    skins.forEach((skin) => {
      // Walking animation
      this.anims.create({
        key: `${skin}_walk`,
        frames: [
          { key: "players", frame: `${skin}_02.png` }, // Left foot forward
          { key: "players", frame: `${skin}_04.png` }, // Right foot forward
        ],
        frameRate: 5,
        repeat: -1,
      });
    });
  }
}
