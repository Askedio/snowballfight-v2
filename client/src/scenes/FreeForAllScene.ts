import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { Client } from "colyseus.js";
import { BACKEND_URL } from "../backend";

export class FreeForAllScene extends Phaser.Scene {
  room: Room;
  roomName: string;
  client: Client;
  skin: string;
  debugging = false;

  currentPlayer: Phaser.GameObjects.Container;
  playerEntities: { [sessionId: string]: Phaser.GameObjects.Container } = {};
  playerHealth: { [sessionId: string]: Phaser.GameObjects.Text } = {};
  playerName: { [sessionId: string]: Phaser.GameObjects.Text } = {};
  bulletEntities: { [bulletId: string]: Phaser.GameObjects.Image } = {};
  pickupEntities: {
    [pickupId: string]:
      | Phaser.GameObjects.Image
      | Phaser.GameObjects.Sprite
      | Phaser.GameObjects.Container;
  } = {}; // Add this line

  debugFPS: Phaser.GameObjects.Text;

  cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
  wasdKeys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  rKey: Phaser.Input.Keyboard.Key;
  eKey: Phaser.Input.Keyboard.Key;

  inputPayload = {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
    e: false,
    r: false,
    pointer: undefined,
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

    this.load.atlas(
      "winterobjects",
      "assets/sprites/winterobjects.png",
      "assets/sprites/winterobjects.json"
    );

    this.load.atlas(
      "health",
      "assets/sprites/health.png",
      "assets/sprites/health.json"
    );

    this.load.image(
      "tree",
      "assets/maps/winter/png/128/objects/non-tileable/Tree.png"
    );
    this.load.image(
      "snowman",
      "assets/maps/winter/png/128/objects/non-tileable/IceMan.png"
    );
    this.load.image("cannon", "assets/images/weapons/snowballfire.png");

    this.load.atlas(
      "kaboom",
      "assets/sprites/explosion.png",
      "assets/sprites/explosion.json"
    );

    this.load.atlas(
      "explosion2",
      "assets/sprites/explosion2.png",
      "assets/sprites/explosion2.json"
    );

    this.load.audio("explosion", "assets/sounds/explosion.mp3");
    this.load.audio(
      "bullet1",
      "assets/sounds/impacts/bullet_impact_snow_01.mp3"
    );
    this.load.audio(
      "bullet2",
      "assets/sounds/impacts/bullet_impact_snow_02.mp3"
    );
    this.load.audio(
      "bullet3",
      "assets/sounds/impacts/bullet_impact_snow_03.mp3"
    );
    this.load.audio(
      "bullet4",
      "assets/sounds/impacts/bullet_impact_snow_04.mp3"
    );
    this.load.audio(
      "bullet5",
      "assets/sounds/impacts/bullet_impact_snow_05.mp3"
    );
    this.load.audio("chime1", "assets/sounds/chime1.mp3");
    this.load.audio("chime2", "assets/sounds/chime2.wav");
    this.load.audio("chime3", "assets/sounds/chime3.wav");
    this.load.audio("laugh1", "assets/sounds/laugh1.mp3");
    this.load.audio("move1", "assets/sounds/move1.wav");
    this.load.audio("shoot1", "assets/sounds/shoot1.mp3");

    this.load.audio(
      "footstep1",
      "assets/sounds/footsteps/Footstep_Snow_Walk_06.mp3"
    );
    this.load.audio(
      "footstep2",
      "assets/sounds/footsteps/Footstep_Snow_Walk_07.mp3"
    );

    this.load.audio(
      "footstepRun1",
      "assets/sounds/footsteps/Footstep_Snow_Run_06.mp3"
    );
    this.load.audio(
      "footstepRun2",
      "assets/sounds/footsteps/Footstep_Snow_Run_07.mp3"
    );

    this.load.audio(
      "smash1",
      "assets/sounds/smashes/Snow_Ball_Smash_Hard_01.mp3"
    );
    this.load.audio(
      "smash2",
      "assets/sounds/smashes/Snow_Ball_Smash_Hard_02.mp3"
    );
    this.load.audio(
      "smash3",
      "assets/sounds/smashes/Snow_Ball_Smash_Medium_04.mp3"
    );
    this.load.audio(
      "smash4",
      "assets/sounds/smashes/Snow_Ball_Smash_Hard_05.mp3"
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
    document.getElementById("error").innerHTML = "";

    await this.connect();

    if (!this.room?.state) {
      console.error("Unable to join, no state!");
      document.getElementById("error").innerHTML =
        "Sorry, there was a problem while loading the game.";

      return;
    }

    this.debugFPS = this.add.text(4, 4, "", {
      color: "#ff0000",
      font: "11px Helvetica Neue",
    });

    this.add.image(0, 0, "Tileset").setOrigin(0, 0);
    this.cameras.main.setBounds(0, 0, 2240, 1344);
    this.physics.world.setBounds(0, 0, 2240 * 2, 1344 * 2);

    const map = this.make.tilemap({ key: "tilemap" });

    const tileset = map.addTilesetImage("Tileset");

    map.createLayer("base", tileset); // base

    this.createAnimations();

    this.setRoomListeners();

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

    this.rKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.R,
      false
    );
    this.eKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
      false
    );

    const tabKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.TAB
    );
    tabKey.on("down", this.showLeaderboard.bind(this));
    tabKey.on("up", this.hideLeaderboard.bind(this));

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
        if (roomName !== this.roomName) {
          this.roomName = roomName;
          console.log(
            "leaving room, removeAllListeners, remove all users",
            this.room.id
          );
          this.room.removeAllListeners();
          await this.room.leave(true);

          for (const sessionId in this.playerEntities) {
            const container = this.playerEntities[sessionId];
            if (container) {
              container.destroy();
              delete this.playerEntities[sessionId];
            }
          }

          this.room = await this.client.joinOrCreate("user_room", {
            customRoomName: roomName,
          });
          this.setRoomListeners();
        }
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
      // Create a container to hold the pickup sprite and the debugging border
      const pickupContainer = this.add.container(pickup.x, pickup.y);

      // Create the pickup sprite
      let pickupEntity: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
      if (pickup.isSprite) {
        pickupEntity = this.add.sprite(
          0, // Position relative to the container
          0,
          pickup.asset,
          pickup.spriteFrame
        );
      } else {
        pickupEntity = this.add.image(0, 0, pickup.asset);
      }

      // Scale and rotate the sprite if needed
      pickupEntity.setScale(pickup.scale);

      // Add the sprite to the container
      pickupContainer.add(pickupEntity);

      // Create a debugging border based on the collision shape
      let debugBorder: Phaser.GameObjects.Graphics | null = null;

      const offsetX = pickup.colissionOffsetX || 0;
      const offsetY = pickup.colissionOffsetY || 0;

      if (this.debugging) {
        if (!pickup.colissionShape || pickup.colissionShape === "circle") {
          debugBorder = this.add.graphics();
          debugBorder.lineStyle(2, 0xff0000);
          debugBorder.strokeCircle(offsetX, offsetY, pickup.radius);
        } else if (pickup.colissionShape === "box") {
          debugBorder = this.add.graphics();
          debugBorder.lineStyle(2, 0xff0000); // Red border with transparency

          // Define the inset amount (how much the border should shrink inward)
          const insetAmount = 8; // Adjust this value as needed

          // Calculate the inset dimensions
          const insetWidth = pickup.colissionWidth - insetAmount * 2;
          const insetHeight = pickup.colissionHeight - insetAmount * 2;

          // Draw the inset border
          debugBorder.strokeRect(
            offsetX - insetWidth / 2,
            offsetY - insetHeight / 2,
            insetWidth,
            insetHeight
          );
        }
      }

      // Add the debug border to the container
      if (debugBorder) {
        pickupContainer.add(debugBorder);
      }

      if (pickup.rotation) {
        pickupContainer.setRotation(pickup.rotation);
      }

      // Set the depth if the pickup should appear above other elements
      if (pickup.bringToTop) {
        pickupContainer.setDepth(10);
      } else {
        pickupContainer.setDepth(2);
      }

      // Add the container to the pickup entities
      this.pickupEntities[pickup.id] = pickupContainer;
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
      console.log("add player", player.name);
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

      const playerAmmoText = this.add.text(
        0, // X relative to the container
        -30, // Y above the sprite
        `B: ${player.ammo || 100}`,
        { color: "#ffffff", font: "10px Helvetica Neue" }
      );

      playerNameText.setOrigin(0.5, 0.5); // Centered
      playerSprite.setOrigin(0.5, 0.5); // Centered
      playerHealthText.setOrigin(-0.5, 0.5); // Centered
      playerAmmoText.setOrigin(2, 0.5); // Centered

      const containerItems: any = [
        playerSprite,
        playerHealthText,
        playerNameText,
        playerAmmoText,
      ];

      let debugBorder: Phaser.GameObjects.Graphics | null = null;

      if (this.debugging) {
        debugBorder = this.add.graphics();
        debugBorder.lineStyle(2, 0xff0000);
        debugBorder.strokeCircle(0, 0, player.playerRadius);
        containerItems.push(debugBorder);
      }

      // Add both to a container
      const playerContainer = this.add.container(
        player.x,
        player.y,
        containerItems
      );

      // Optionally set size (useful for debugging)
      playerContainer.setSize(playerSprite.width, playerSprite.height);

      playerContainer.setDepth(3);

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
        const ammoText = container.list[3] as Phaser.GameObjects.Text;

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
              // to-do: add foot steps sound for current and remote players, diff sounds
              //this.playSpatialSound(player, "footstep1")

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
            ammoText.setText(`B: ${player.ammo}`);
            nameText.setText(`${player.name}`);
          }
        }
      });
    });

    // Listen for player death event from the server
    this.room.onMessage("player-death", (data) => {
      const { sessionId, player, killer } = data;

      const container = this.playerEntities[sessionId];

      if (container) {
        this.playExplosionGrey(container.x, container.y, 0.6);
      }

      this.playSpatialSound(player, "smash1");

      if (sessionId === this.room.sessionId) {
        this.handlePlayerDeath(killer);
      }
    });

    // Handle player removal
    this.room.state.players.onRemove((player, sessionId) => {
      console.log("remove player", player.name);
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
      bulletEntity.setDepth(3);
      this.bulletEntities[bulletId] = bulletEntity;

      bullet.onChange(() => {
        if (this.bulletEntities[bulletId]) {
          this.bulletEntities[bulletId].setPosition(bullet.x, bullet.y);
        }
      });
    });

    this.room.onMessage("bullet-destroyed", ({ bullet }) => {
      this.playExplosionGrey(bullet.x, bullet.y);

      this.playSpatialSound(bullet, "bullet1");
    });

    this.room.state.bullets.onRemove((bullet, bulletId) => {
      const bulletEntity = this.bulletEntities[bulletId];
      if (bulletEntity) {
        bulletEntity.destroy();
        delete this.bulletEntities[bulletId];
      }
    });

    this.room.onMessage("play-sound", ({ item, key }) => {
      this.playSpatialSound(item, key);
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

        this.roomName = roomName;
      } else {
        this.room = await client.joinOrCreate("default_room", {});
      }

      window.dispatchEvent(new Event("ready"));
    } catch (e) {
      console.log(e);

      connectionStatusText.text = "Could not connect with the server.";
    }

    connectionStatusText.destroy();
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
    this.inputPayload.r = this.rKey.isDown;
    this.inputPayload.e = this.eKey.isDown;

    const pointer = this.input.activePointer;
    
    this.inputPayload.pointer = {
      x: pointer.worldX,
      y: pointer.worldY,
      shoot: pointer.leftButtonDown(),
      reload: pointer.rightButtonDown(),
    };

    try {
      this.room.send("input", this.inputPayload);
    } catch (e: any) {
      console.log("Detect error, exit?");
      document.getElementById("error").innerHTML =
        "Sorry, there was a problem while loading the game.";

      console.error(e);
    }
  }

  handlePlayerDeath(killer: any) {
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
      document.getElementById("active-player-kills").innerText = `${
        player.kills || 0
      }`;
      document.getElementById("active-player-deaths").innerText = `${
        player.deaths || 0
      }`;

      document.getElementById("active-player-speed").innerText = `${
        player.speed || 4
      }`;
    }
  }

  showLeaderboard() {
    const leaderboard = document.getElementById("leaderboard");
    const leaderboardBody = document.getElementById("leaderboard-body");

    leaderboard.style.display = "block";
    leaderboardBody.innerHTML = ""; // Clear previous content

    const players = Array.from(this.room.state.players.entries()).map(
      ([sessionId, player]: any) => ({
        sessionId,
        name: player.name || "",
        kills: player.kills || 0,
        deaths: player.deaths || 0,
        isDead: player.isDead || false,
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
    explosion.setDepth(11);
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

  playSpatialSound(target, sound: string, multiplier = 0.3) {
    const playerX = target.x;
    const playerY = target.y;
    const currentPlayerX = this.currentPlayer.x;
    const currentPlayerY = this.currentPlayer.y;

    // Calculate the distance between the target and the current player
    const dx = playerX - currentPlayerX;
    const dy = playerY - currentPlayerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Dynamically adjust max distance based on map size
    const maxDistance =
      Math.sqrt(
        this.room.state.mapWidth ** 2 + this.room.state.mapHeight ** 2
      ) / 2;

    // Normalize the distance to determine volume (1 at close range, 0 at max distance)
    const volume =
      Phaser.Math.Clamp(1 - distance / maxDistance, 0, 1) * multiplier;

    // Calculate the pan value (-1 for far left, 1 for far right)
    const pan = Phaser.Math.Clamp(dx / maxDistance, -1, 1);

    // Play the sound with the calculated volume and pan
    this.sound.play(sound, {
      volume, // Final volume scaled by the multiplier
      pan, // Panning based on the horizontal offset
    });
  }
}
