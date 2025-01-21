import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { Client } from "colyseus.js";
import { BACKEND_URL } from "../backend";

export class Part4Scene extends Phaser.Scene {
  room: Room;
  client: Client;
  skin: string;

  currentPlayer: Phaser.GameObjects.Container;
  playerEntities: { [sessionId: string]: Phaser.GameObjects.Container } = {};
  playerHealth: { [sessionId: string]: Phaser.GameObjects.Text } = {};
  playerName: { [sessionId: string]: Phaser.GameObjects.Text } = {};
  bulletEntities: { [bulletId: string]: Phaser.GameObjects.Image } = {};
  pickupEntities: { [pickupId: string]: Phaser.GameObjects.Image } = {}; // Add this line

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

  disableChat = false;

  constructor() {
    super({ key: "part4" });

    this.disableChat = false;

    // Get the chat input element
    const chatInput = document.getElementById("chatSend") as HTMLInputElement;

    // Add a mouseleave event listener to the chat input
    if (chatInput) {
      chatInput.addEventListener("mouseleave", () => {
        if (document.activeElement === chatInput) {
          chatInput.blur(); // Remove focus when the mouse leaves the input
        }
      });
    }

    document.getElementById("chatSend").addEventListener("keydown", (e) => {
      // Check if the pressed key is Enter (key code 13)
      if (e.key === "Enter") {
        if (this.disableChat) {
          return; // Prevent further action if chat is disabled
        }

        this.disableChat = true; // Disable chat temporarily

        const chatInput = document.getElementById(
          "chatSend"
        ) as HTMLInputElement;
        const message = chatInput.value.trim(); // Trim leading/trailing spaces

        if (message) {
          this.room.send("chat", { message });
          chatInput.value = ""; // Clear the input field
        }

        // Re-enable chat after 1 second
        setTimeout(() => {
          this.disableChat = false;
        }, 1000);

        e.preventDefault(); // Prevent default behavior (e.g., line break in input)
      }
    });
  }

  preload() {
    this.load.image("snowball", "assets/images/weapons/snowball.png");

    this.load.atlas(
      "players",
      "assets/sprites/players.png",
      "assets/sprites/players.json"
    );

    this.load.atlas(
      "explosiongrey",
      "assets/sprites/explosiongrey.png",
      "assets/sprites/explosiongrey.json"
    );

    // load the PNG file
    this.load.image("Tileset", "assets/maps/winter/map.png");

    // load the JSON file
    this.load.tilemapTiledJSON("tilemap", "assets/maps/winter/map.json");

    this.load.image("devil", "assets/images/pickups/devil.png");
    this.load.image("skull", "assets/images/pickups/skull.png");
    this.load.image("sword", "assets/images/pickups/sword.png");
    this.load.image("treasure", "assets/images/pickups/treasure.png");
    this.load.image("wings", "assets/images/pickups/wings.png");
  }

  async create() {
    this.debugFPS = this.add.text(4, 4, "", {
      color: "#ff0000",
      font: "11px Helvetica Neue",
    });

    this.add.image(0, 0, "Tileset").setOrigin(0, 0);
    this.cameras.main.setBounds(0, 0, 2240, 1344);
    this.physics.world.setBounds(0, 0, 2240 * 2, 1344 * 2);

    const map = this.make.tilemap({ key: "tilemap" });

    const tileset = map.addTilesetImage("Tileset");

    map.createLayer("base", tileset);

    await this.connect();

    if (!this.room?.state) {
      console.error("Unable to join, no state!");
      document.getElementById("error").innerHTML =
        "Sorry, there was a problem while loading the game.";

      return;
    }

    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
    };
    const spaceBar = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      false
    );

    const tabKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.TAB
    );
    tabKey.on("down", this.showLeaderboard.bind(this));
    tabKey.on("up", this.hideLeaderboard.bind(this));

    setInterval(() => {
      if (this.room?.state?.players) {
        const players = Array.from(this.room.state.players.entries()).map(
          ([sessionId, player]) => ({
            name: player.name,
            sessionId,
            x: player.x,
            y: player.y,
            health: player.health,
            kills: player.kills,
            deaths: player.deaths,
            isDead: player.isDead,
          })
        );
      }
    }, 30000);

    setInterval(() => {
      this.updatePlayerStats();
    }, 1000);

    // Space bar for shooting
    spaceBar.on("down", () => {
      const chatInput = document.getElementById("chatSend") as HTMLInputElement;
      if (chatInput && document.activeElement === chatInput) {
        return true; // Ignore space bar if the chat input is focused
      }

      if (this.canShoot) {
        this.inputPayload.shoot = true;
      }
    });

    // Reset shooting on space bar release
    spaceBar.on("up", () => {
      this.inputPayload.shoot = false;
    });

    this.createAnimations();

    this.setRoomListeners();

    document.getElementById("skinlist").addEventListener("click", (e: any) => {
      if (e.target && e.target.nodeName === "IMG") {
        const active = document.getElementsByClassName("active");
        if (active.length) active[0].className = "";
        const newid = document.getElementById(e.target.id).parentElement;
        newid.className = "active";

        this.skin = e.target.id;
      }
    });

    window.addEventListener("player-rejoin", async () => {
      const playerName = (<HTMLInputElement>(
        document.getElementById("player-name")
      )).value.trim();

      const roomName =
        (<HTMLInputElement>document.getElementById("room-name")).value.trim() ||
        window.location.hash.substring(1);

      if (roomName) {
        await this.room.leave();
        this.room = await this.client.joinOrCreate("user_room", {
          customRoomName: roomName,
        });
        this.setRoomListeners();
        this.room.send("rejoin", { playerName, roomName, skin: this.skin });
        window.location.hash = roomName;
      } else {
        this.room.send("rejoin", { playerName, roomName, skin: this.skin });
      }

      window.dispatchEvent(new Event("joined"));
    });
  }

  setRoomListeners() {
    this.room.state.pickups.onAdd((pickup) => {
      const pickupSprite = this.add.image(pickup.x, pickup.y, pickup.type); // Use type as the key for preloaded assets
      pickupSprite.setScale(0.08); // Reduce the size to 50% of the original

      this.pickupEntities[pickup.id] = pickupSprite;

      pickup.onChange(() => {
        pickupSprite.setPosition(pickup.x, pickup.y);
      });
    });

    this.room.state.pickups.onRemove((pickup) => {
      const sprite = this.pickupEntities[pickup.id]; // Find the sprite associated with the pickup
      if (sprite) {
        sprite.destroy(); // Remove the sprite from the scene
        delete this.pickupEntities[pickup.id]; // Clean up the reference
      }
    });

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
        { color: "#ffffff", font: "10px Helvetica Neue" }
      );

      const playerNameText = this.add.text(
        0, // X relative to the container
        -42, // Y above the sprite
        `${player.name}`,
        { color: "#ffffff", font: "12px Helvetica Neue" }
      );
      playerNameText.setOrigin(0.5, 0.5); // Centered

      playerSprite.setOrigin(0.5, 0.5); // Centered
      playerHealthText.setOrigin(0.5, 0.5); // Centered

      // Add both to a container
      const playerContainer = this.add.container(player.x, player.y, [
        playerSprite,
        playerHealthText,
        playerNameText,
      ]);

      // Optionally set size (useful for debugging)
      playerContainer.setSize(playerSprite.width, playerSprite.height);

      this.playerEntities[sessionId] = playerContainer;

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

        const nameText = container.list[2] as Phaser.GameObjects.Text;

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
            nameText.setText(`${player.name}`);
          }
        }
      });
    });

    // Listen for player death event from the server
    this.room.onMessage("player-death", (data) => {
      const { sessionId, killer } = data;

      const container = this.playerEntities[sessionId];
      if (container) {
        this.playExplosionGrey(container.x, container.y, 0.6);
      }

      if (sessionId === this.room.sessionId) {
        this.handlePlayerDeath(killer);
      }
    });

    // Handle player removal
    this.room.state.players.onRemove((player, sessionId) => {
      const container = this.playerEntities[sessionId];
      if (container) {
        this.playExplosionGrey(container.x, container.y, 0.6);

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
        this.playExplosionGrey(bulletEntity.x, bulletEntity.y);

        bulletEntity.destroy();
        delete this.bulletEntities[bulletId];
      }
    });

    const chatBox = document.getElementById("chatBox") as HTMLUListElement;

    this.room.onMessage("chat", ({ playerName, message, timestamp }) => {
      const time = new Date(timestamp).toLocaleTimeString();

      // Add the chat message to the chat box
      const chatItem = document.createElement("li");
      chatItem.textContent = `${playerName}: ${message}`;
      chatBox.appendChild(chatItem);

      // Scroll to the bottom of the chat box
      chatBox.scrollTop = chatBox.scrollHeight;

      // Remove the chat item after 1 minute
      setTimeout(() => {
        chatItem.remove();
      }, 10000);
    });
  }

  async connect() {
    const connectionStatusText = this.add
      .text(0, 0, "Trying to connect with the server...")
      .setStyle({ color: "#ff0000" })
      .setPadding(4);

    const client = new Client(BACKEND_URL);
    this.client = client;

    try {
      let roomName = "default_room";

      if (window.location.hash) {
        roomName = window.location.hash.substring(1);
      }

      if (roomName) {
        this.room = await client.joinOrCreate("user_room", {
          customRoomName: roomName,
        });
      } else {
        this.room = await client.joinOrCreate("default_room", {});
      }

      window.dispatchEvent(new Event("ready"));
      connectionStatusText.destroy();
    } catch (e) {
      console.log(e);

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
    try {
      this.room.send("input", this.inputPayload);
    } catch (e: any) {
      console.log("Detect error, exit?");
      console.error(e);
    }
  }

  private handlePlayerDeath(killer: any) {
    const joinModal = document.getElementById("join-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalMessage = document.getElementById("modal-message");
    const joinButton = document.getElementById("join-button");

    document.getElementById("killedBy").innerHTML = `Killed By ${killer.name}`;

    modalTitle.textContent = "You Died!";
    modalMessage.textContent = "Rejoin the snowball fight!";
    joinButton.textContent = "Rejoin Game";

    joinModal.classList.add("show");
  }

  updatePlayerStats() {
    if (!this.room?.state?.players) return;

    const player = this.room.state.players.get(this.room.sessionId);
    if (player) {
      document.getElementById(
        "active-player-kills"
      ).innerText = `${player.kills}`;
      document.getElementById(
        "active-player-deaths"
      ).innerText = `${player.deaths}`;

      document.getElementById(
        "active-player-speed"
      ).innerText = `${player.speed}`;
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
        name: player.name,
        kills: player.kills,
        deaths: player.deaths,
        isDead: player.isDead,
      })
    );

    players.forEach((player) => {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.textContent = player.name || player.sessionId;
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

  playExplosionGrey(x: number, y: number, scale = 0.2) {
    if (!this.withinScreenView(x, y, 100)) {
      return;
    }

    const explosion = this.add.sprite(x, y, "explosiongrey");
    explosion.setScale(scale); // Scale down to 50% of its original size

    explosion.play("explosiongrey");
    explosion.on("animationcomplete", () => {
      explosion.destroy(); // Clean up after the animation finishes
    });
  }

  withinScreenView(x: number, y: number, offset = 0): boolean {
    const camera = this.cameras.main;

    // Calculate the screen bounds with offset
    const left = camera.scrollX - offset;
    const right = camera.scrollX + camera.width + offset;
    const top = camera.scrollY - offset;
    const bottom = camera.scrollY + camera.height + offset;

    // Check if the coordinates are within the bounds
    return x >= left && x <= right && y >= top && y <= bottom;
  }

  createAnimations() {
    this.anims.create({
      key: "explosiongrey",
      frames: this.anims.generateFrameNames("explosiongrey", {
        start: 13, // Start frame (from Effect-fx03_13.png)
        end: 24, // End frame (from Effect-fx03_24.png)
        prefix: "Effect-fx03_", // Common prefix for filenames
        suffix: ".png", // File extension
      }),
      frameRate: 15, // Adjust the frame rate as needed
      repeat: 0, // Do not loop the animation
      hideOnComplete: true, // Hide the sprite when the animation finishes
    });

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
