import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { Client } from "colyseus.js";
import { BACKEND_URL } from "../backend";

export class BaseScene extends Phaser.Scene {
  roomName: string;
  userRoomName: string;

  mode: string;
  scoring: string;
  teams: boolean;

  room: Room;
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

  cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
  keyboardKeys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    R: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
  };

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

  eventListeners: any[] = [];

  destroy() {
    console.log(this.eventListeners);
    this.eventListeners.map((_) => _.removeEventListener());
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

  initMap() {}

  async create() {
    document.getElementById("error").innerHTML = "";

    await this.connect();

    if (!this.room?.state) {
      console.error("Unable to join, no state!");
      document.getElementById("error").innerHTML =
        "Sorry, there was a problem while loading the game.";

      return;
    }

    this.initMap();

    this.createAnimations();

    this.setRoomListeners();

    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.keyboardKeys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
      R: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R, false),
      E: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false),
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

    const switchListener = document
      .getElementById("switch")
      .addEventListener("click", (e: any) => {
        if (e.target.id !== "switch") {
          this.destroy();
          console.log(e.target.id);

          this.changeScene("ctf");
          const active = document.getElementsByClassName("activeMode");
          if (active.length) active[0].className = "";

          const newid = document.getElementById(e.target.id);
          newid.className = "activeMode";
        }
      });
    this.eventListeners.push(switchListener);

    const skinListener = document
      .getElementById("skinlist")
      .addEventListener("click", (e: any) => {
        if (e.target && e.target.nodeName === "IMG") {
          const active = document.getElementsByClassName("active");
          if (active.length) active[0].className = "";
          const newid = document.getElementById(e.target.id).parentElement;
          newid.className = "active";

          this.skin = e.target.id;
        }
      });
    this.eventListeners.push(skinListener);

    const rejoinListener = window.addEventListener(
      "player-rejoin",
      async () => {
        const playerName = (<HTMLInputElement>(
          document.getElementById("player-name")
        )).value.trim();

        const roomName =
          (<HTMLInputElement>(
            document.getElementById("room-name")
          )).value.trim() || window.location.hash.substring(1);

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
      }
    );
    this.eventListeners.push(rejoinListener);
  }

  init() {
    this.disableChat = false;

    // Get the chat input element
    const chatInput = document.getElementById("chatSend") as HTMLInputElement;

    // Add a mouseleave event listener to the chat input
    if (chatInput) {
      const chatListener = chatInput.addEventListener("mouseleave", () => {
        if (document.activeElement === chatInput) {
          chatInput.blur(); // Remove focus when the mouse leaves the input
        }
      });
      this.eventListeners.push(chatListener);
    }

    const keydownListener = document
      .getElementById("chatSend")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          if (this.disableChat) {
            return;
          }

          this.disableChat = true;

          const chatInput = document.getElementById(
            "chatSend"
          ) as HTMLInputElement;
          const message = chatInput.value.trim();
          if (message) {
            this.room.send("chat", { message });
            chatInput.value = "";
          }

          // Re-enable chat after 1 second
          setTimeout(() => {
            this.disableChat = false;
          }, 1000);

          e.preventDefault();
        }
      });
    this.eventListeners.push(keydownListener);
  }

  async connect() {
    document.getElementById("connectionStatusText").innerHTML =
      "Connecting to servers...";

    const client = new Client(BACKEND_URL);
    this.client = client;

    try {
      let roomName = this.roomName;

      if (window.location.hash) {
        roomName = window.location.hash.substring(1);
      }

      if (roomName) {
        this.room = await client.joinOrCreate(this.userRoomName, {
          customRoomName: roomName,
        });

        this.roomName = roomName;
      } else {
        this.room = await client.joinOrCreate(this.roomName, {});
      }

      window.dispatchEvent(new Event("ready"));
    } catch (e) {
      console.log(e);

      document.getElementById("connectionStatusText").innerHTML =
        "Could not connect to the servers.";
      return;
    }

    document.getElementById("connectionStatusText").innerHTML = "";
  }

  changeScene(scene: string) {
    this.time.delayedCall(500, this.scene.switch, [scene], this.scene);
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

  update(time: number, delta: number): void {
    if (!this.currentPlayer) return;

    document.getElementById(
      "fps"
    ).innerHTML = `FPS: ${this.game.loop.actualFps.toFixed(1)}`;

    this.inputPayload.left =
      this.cursorKeys.left.isDown || this.keyboardKeys.A.isDown;
    this.inputPayload.right =
      this.cursorKeys.right.isDown || this.keyboardKeys.D.isDown;
    this.inputPayload.up =
      this.cursorKeys.up.isDown || this.keyboardKeys.W.isDown;
    this.inputPayload.down =
      this.cursorKeys.down.isDown || this.keyboardKeys.S.isDown;
    this.inputPayload.r = this.keyboardKeys.R.isDown;
    this.inputPayload.e = this.keyboardKeys.E.isDown;

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
      if (this.debugging) {
        const offsetX = pickup.colissionOffsetX || 0;
        const offsetY = pickup.colissionOffsetY || 0;

        let debugBorder: Phaser.GameObjects.Graphics | null = null;

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
      const playerSprite = this.add.sprite(
        0,
        0,
        "players",
        `${player.skin}_01.png`
      );
      playerSprite.setOrigin(0.5, 0.5);

      const playerNameText = this.add.text(0, -43, `${player.name}`, {
        color: "#ffffff",
        font: "12px Helvetica Neue",
      });
      playerNameText.setOrigin(0.5, 0.5);
      playerNameText.setShadow(1, 1, "#000000", 2, true, true); // Offset (1, 1), black shadow, blur radius 2

      // Add a stroke (outline) around the text
      playerNameText.setStroke("#999999", 0.5); // Black stroke with thickness 2

      // Health bar background
      const healthBarBg = this.add.graphics();
      healthBarBg.fillStyle(0x8b0000, 1); // Light grey background
      healthBarBg.fillRect(-25, -33, 50, 2); // 50px wide, 2px tall, centered above

      // Health bar foreground
      const healthBar = this.add.graphics();
      healthBar.fillStyle(0x4caf50, 1); // Green bar
      healthBar.fillRect(-25, -33, (player.health / 100) * 50, 2);

      // Ammo bar background
      const ammoBarBg = this.add.graphics();
      ammoBarBg.fillStyle(0xaaaaaa, 1); // Light grey background
      ammoBarBg.fillRect(-25, -29, 50, 2); // 50px wide, 2px tall, positioned slightly below the health bar

      // Ammo bar foreground
      const ammoBar = this.add.graphics();
      ammoBar.fillStyle(0x0000ff, 1); // Blue bar
      ammoBar.fillRect(-25, -29, (player.ammo / 100) * 50, 2);

      const containerItems: any = [
        playerSprite,
        playerNameText,
        healthBarBg,
        healthBar,
        ammoBarBg,
        ammoBar,
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

      playerContainer.setSize(playerSprite.width, playerSprite.height);

      playerContainer.setDepth(3);

      this.playerEntities[sessionId] = playerContainer;

      if (sessionId === this.room.sessionId) {
        this.currentPlayer = playerContainer;
        this.cameras.main.startFollow(this.currentPlayer, true);
      }

      // React to player state changes, playeronchange
      player.onChange(() => {
        const container = this.playerEntities[
          sessionId
        ] as Phaser.GameObjects.Container;

        if (container) {
          container.setPosition(player.x, player.y);

          if (player.isDead) {
            container.setVisible(false);
          } else {
            container.setVisible(true);

            if (player.isProtected) {
              playerContainer.setAlpha(0.08);
            } else {
              playerContainer.setAlpha(1);
            }

            this.tweens.add({
              targets: container,
              x: player.x,
              y: player.y,
              duration: 100,
              ease: "Linear",
            });

            playerSprite.setRotation(player.rotation);

            if (player.isMoving) {
              // to-do: add foot steps sound for current and remote players, diff sounds
              /*this.playSpatialSound(
                player,
                player.speed > player.defaultSpeed
                  ? player.runningSound
                  : player.walkingSound
              );*/

              if (
                playerSprite.anims.currentAnim?.key !== `${player.skin}_walk` ||
                !playerSprite.anims.isPlaying
              ) {
                playerSprite.play(`${player.skin}_walk`, true);
              }
            } else {
              if (playerSprite.anims.isPlaying) {
                playerSprite.stop();
                playerSprite.setTexture("players", `${player.skin}_01.png`);
              }
            }

            healthBar.clear();
            healthBar.fillStyle(0x4caf50, 1); // Green
            healthBar.fillRect(
              -25,
              -33,
              (player.health / player.maxHealth) * 50,
              2
            );

            ammoBar.clear();
            ammoBar.fillStyle(0x0000ff, 1); // Blue
            ammoBar.fillRect(-25, -29, (player.ammo / player.maxAmmo) * 50, 2);

            playerNameText.setText(`${player.name}`);
          }
        }
      });
    });

    // Listen for player death event from the server
    this.room.onMessage("player-death", (data) => {
      const { sessionId, player, killer } = data;

      const container = this.playerEntities[sessionId];

      if (container) {
        if (player.onKilledAnimation) {
          this.playAnimation(
            player.onKilledAnimation,
            container.x,
            container.y,
            0.6
          );
        }
      }

      this.playSpatialSound(player, player.onKilledSound);

      if (sessionId === this.room.sessionId) {
        this.handlePlayerDeath(killer);
      }
    });

    // Handle player removal
    this.room.state.players.onRemove((player, sessionId) => {
      console.log("remove player", player.name);
      const container = this.playerEntities[sessionId];
      if (container) {
        if (player.onLeftMapAnimation) {
          this.playAnimation(
            player.onLeftMapAnimation,
            container.x,
            container.y,
            0.6
          );
        }

        container.destroy();
        delete this.playerEntities[sessionId];
      }
    });

    // Handle bullet addition
    this.room.state.bullets.onAdd((bullet, bulletId) => {
      const bulletEntity = this.add.image(bullet.x, bullet.y, bullet.skin);
      bulletEntity.setOrigin(0.5, 0.5);
      bulletEntity.setDepth(3);
      this.bulletEntities[bulletId] = bulletEntity;

      bullet.onChange(() => {
        if (this.bulletEntities[bulletId]) {
          this.bulletEntities[bulletId].setPosition(bullet.x, bullet.y);
        }
      });
    });

    this.room.onMessage(
      "bullet-destroyed",
      ({ bullet, pickup, killer, player }) => {
        switch (bullet.colissionType) {
          case "pickup":
            if (!pickup.disablePlayBulletImpactSound) {
              this.playSpatialSound(
                bullet,
                pickup.impactSound || bullet.impactOnPickupSound
              );
            }
            this.playAnimation(
              bullet.impactOnPickupAnimation,
              bullet.x,
              bullet.y
            );
            break;

          case "player":
            console.log(bullet);
            this.playSpatialSound(bullet, bullet.impactOnPlayerSound);
            this.playAnimation(
              bullet.impactOnPlayerAnimation,
              bullet.x,
              bullet.y
            );

            break;
          case "colissionLayer":
            this.playSpatialSound(bullet, bullet.impactOnColissionSound);
            this.playAnimation(
              bullet.impactOnColissionAnimation,
              bullet.x,
              bullet.y
            );

            break;

          case "timeout":
            this.playSpatialSound(bullet, bullet.impactOnTimeoutSound);
            this.playAnimation(
              bullet.impactOnTimeoutAnimation,
              bullet.x,
              bullet.y
            );

            break;

          case "outofbounds":
            this.playSpatialSound(bullet, bullet.impactOnOutofboundsSound);
            this.playAnimation(
              bullet.impactOnOutofboundsAnimation,
              bullet.x,
              bullet.y
            );

            break;

          default:
            this.playSpatialSound(bullet, bullet.impactSound);
            this.playAnimation(bullet.impactAnimation, bullet.x, bullet.y);
        }
      }
    );

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

  playAnimation(key: string, x: number, y: number, scale = 0.2) {
    if (!key || !this.withinScreenView(x, y, 100)) {
      return;
    }

    const animation = this.add.sprite(x, y, key);
    animation.setScale(scale);
    animation.setDepth(11);
    animation.play(key);
    animation.on("animationcomplete", () => {
      animation.destroy();
    });
  }

  createAnimations() {
    this.anims.create({
      key: "explosiongrey",
      frames: this.anims.generateFrameNames("explosiongrey", {
        start: 13,
        end: 24,
        prefix: "Effect-fx03_",
        suffix: ".png",
      }),
      frameRate: 15,
      repeat: 0,
      hideOnComplete: true,
    });

    ["playersa", "playersb", "playersc", "playersd"].forEach((skin) => {
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
    if (!sound) {
      return;
    }

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
}
