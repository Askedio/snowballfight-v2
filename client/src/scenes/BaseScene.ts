import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { EventBus } from "../lib/EventBus";
import { roomStore } from "../lib/colyseus";

export class BaseScene extends Phaser.Scene {
  roomName: string;
  userRoomName: string;

  mode: string;
  scoring: string;
  teams: boolean;

  room: Room;
  skin: string;
  debugging = false;

  graphics: any;

  roomStateInterval: any;
  currentPlayerStateInterval: any;

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
    SHIFT: Phaser.Input.Keyboard.Key;
  };

  joystickKeys: {
    joystick: any;
    shoot: any;
    reload: any;
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
    shift: undefined,
  };

  elapsedTime = 0;
  fixedTimeStep = 1000 / 60;
  currentTick = 0;

  canShoot = true;
  shootCooldown = 400;

  enableKeyboard = true;

  disableChat = false;

  preload() {
    this.load.setPath("/.proxy/assets");

    this.load.image("snowball0", "images/weapons/snowball.png");

    this.load.atlas(
      "players",
      "sprites/players.png",
      "sprites/players.json"
    );

    this.load.atlas(
      "explosiongrey",
      "sprites/explosiongrey.png",
      "sprites/explosiongrey.json"
    );

    this.load.atlas(
      "winterobjects",
      "sprites/winterobjects.png",
      "sprites/winterobjects.json"
    );

    this.load.atlas(
      "health",
      "sprites/health.png",
      "sprites/health.json"
    );

    this.load.image("tree", "images/city/tree.png");

    this.load.image("planter", "images/city/planter.png");
    this.load.image("planter-long", "images/city/planter-long.png");

    this.load.image("snowman", "images/IceMan.png");
    this.load.image("cannon", "images/weapons/snowballfire.png");

    this.load.atlas(
      "kaboom",
      "sprites/explosion.png",
      "sprites/explosion.json"
    );

    this.load.atlas(
      "snowball",
      "sprites/weapons/snowball/snowball.png",
      "sprites/weapons/snowball/snowball.json"
    );

    this.load.atlas(
      "explosion2",
      "sprites/explosion2.png",
      "sprites/explosion2.json"
    );

    this.load.audio("explosion", "sounds/explosion.mp3");
    this.load.audio(
      "bullet1",
      "sounds/impacts/bullet_impact_snow_01.mp3"
    );
    this.load.audio(
      "bullet2",
      "sounds/impacts/bullet_impact_snow_02.mp3"
    );
    this.load.audio(
      "bullet3",
      "sounds/impacts/bullet_impact_snow_03.mp3"
    );
    this.load.audio(
      "bullet4",
      "sounds/impacts/bullet_impact_snow_04.mp3"
    );
    this.load.audio(
      "bullet5",
      "sounds/impacts/bullet_impact_snow_05.mp3"
    );
    this.load.audio("chime1", "sounds/chime1.mp3");
    this.load.audio("chime2", "sounds/chime2.wav");
    this.load.audio("chime3", "sounds/chime3.wav");
    this.load.audio("laugh1", "sounds/laugh1.mp3");
    this.load.audio("move1", "sounds/move1.wav");
    this.load.audio("shoot1", "sounds/shoot1.mp3");

    this.load.audio(
      "footstep1",
      "sounds/footsteps/Footstep_Snow_Walk_06.mp3"
    );
    this.load.audio(
      "footstep2",
      "sounds/footsteps/Footstep_Snow_Walk_07.mp3"
    );

    this.load.audio(
      "footstepRun1",
      "sounds/footsteps/Footstep_Snow_Run_06.mp3"
    );
    this.load.audio(
      "footstepRun2",
      "sounds/footsteps/Footstep_Snow_Run_07.mp3"
    );

    this.load.audio(
      "smash1",
      "sounds/smashes/Snow_Ball_Smash_Hard_01.mp3"
    );
    this.load.audio(
      "smash2",
      "sounds/smashes/Snow_Ball_Smash_Hard_02.mp3"
    );
    this.load.audio(
      "smash3",
      "sounds/smashes/Snow_Ball_Smash_Medium_04.mp3"
    );
    this.load.audio(
      "smash4",
      "sounds/smashes/Snow_Ball_Smash_Hard_05.mp3"
    );

    // load the PNG file
    this.load.image("Tileset", "maps/winter/map.png");
    this.load.image("TilesetExtruded", "maps/winter/map-extruded.png");

    // load the JSON file
    this.load.tilemapTiledJSON("tilemap", "maps/winter/map.json");

    this.load.image(
      "devil",
      "images/icons/candy_cane/blue_candy_cane.png"
    );
    this.load.image(
      "skull",
      "images/icons/candy_cane/purple_candy_cane.png"
    );
    this.load.image(
      "sword",
      "images/icons/candy_cane/green_candy_cane.png"
    );
    this.load.image(
      "treasure",
      "images/icons/candy_cane/red_candy_cane.png"
    );
    this.load.image(
      "wings",
      "images/icons/candy_cane/yellow_candy_cane.png"
    );
  }

  initMap() {}

  setError(error: string) {
    EventBus.emit("error", { error });
  }

  clearPickupEntities() {
    Object.keys(this.pickupEntities).forEach((pickupId) => {
      const sprite = this.pickupEntities[pickupId];
      if (sprite) {
        sprite.destroy(); // Remove the sprite from the scene
      }
      delete this.pickupEntities[pickupId]; // Clean up the reference
    });
  }

  clearBulletEntities() {
    Object.keys(this.bulletEntities).forEach((bulletId) => {
      const bulletEntity = this.bulletEntities[bulletId];
      if (bulletEntity) {
        bulletEntity.destroy(); // Remove bullet from the scene
      }
      delete this.bulletEntities[bulletId]; // Clean up reference
    });
  }

  clearPlayerEntities() {
    Object.keys(this.playerEntities).forEach((sessionId) => {
      const container = this.playerEntities[sessionId];
      if (container) {
        container.destroy(); // Remove the container from the scene
      }
      delete this.playerEntities[sessionId]; // Clean up the reference
    });
  }

  drawNavMesh() {
    if (!this.room) return;

    if (!this.graphics) {
      this.graphics = this.add.graphics(); // Ensure graphics object exists
    }

    this.graphics.clear();

    this.graphics.setDepth(100); // Ensure graphics are above other objects
    this.graphics.lineStyle(2, 0x00ff00, 1); // Green outline
    this.graphics.fillStyle(0x0000ff, 0.3); // Blue fill with transparency

    this.room.state.navMesh.forEach((polygon: any, index: number) => {
      if (!polygon.points || polygon.points.length === 0) {
        console.warn(`🚨 Polygon ${index} is missing points!`, polygon);
        return;
      }

      const points = polygon.points.map(
        (p: any) => new Phaser.Math.Vector2(p.x, p.y)
      );

      if (points.length > 2) {
        console.log(`✏️ Drawing Polygon ${index} with points:`, points);

        this.graphics.beginPath();
        this.graphics.moveTo(points[0].x, points[0].y);

        points.forEach((p) => this.graphics.lineTo(p.x, p.y));

        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath(); // ✅ Ensure path is actually drawn
      }
    });

    console.log("🔷 Rendered NavMesh in Phaser");
  }

  async create() {
    try {
      this.events.once("shutdown", () => {
        console.info("Scene is shutting down!");

        this.input.shutdown();
        this.room?.removeAllListeners();
        EventBus.removeAllListeners();
      });

      EventBus.on("follow-player", (sessionId) => {
        const playerContainer = this.children.getByName(sessionId);

        this.cameras?.main?.startFollow(playerContainer, true);
      });

      EventBus.on("disable-keyboard", () => {
        this.enableKeyboard = false;
      });

      EventBus.on("enable-keyboard", () => {
        this.enableKeyboard = true;
      });

      EventBus.on("exit-game", () => {
        this.room?.send("exit-game");
      });

      EventBus.on("change-room", () => {
        // Listeners are set on create, but user can change room in the same scene, so reset room and listeners here.
        console.log("Game change-room");
        this.clearPickupEntities();
        this.clearPlayerEntities();
        this.clearBulletEntities();

        this.room?.removeAllListeners();
        this.room = roomStore.get();
        this.setRoomListeners();
      });

      console.info("Starting scene", this.mode);

      this.setError("");

      this.initMap();

      /*
      this.joystickKeys.joystick = (
        this.plugins.get("rexVirtualJoyStick") as any
      ).add(this, {
        x: 300,
        y: 300,
        radius: 100,
        // base: this.add.circle(0, 0, 100, 0x888888),
        // thumb: this.add.circle(0, 0, 50, 0xcccccc),
        // dir: '8dir',   // 'up&down'|0|'left&right'|1|'4dir'|2|'8dir'|3
        // forceMin: 16,
        // enable: true
      });

      this.joystickKeys.shoot = this.add
        .circle(500, 300, 50)
        .setStrokeStyle(2, 0xff0000)
        .setInteractive()
        .on("pointerdown", () => {
          console.log("Click Button");
        });*/

      this.room = roomStore.get();

      this.createAnimations();

      this.setRoomListeners();

      this.setKeyListeners();

      EventBus.emit("scene-ready", this);
    } catch (e: any) {
      console.error("Failed to initalize create!", e);
    }
  }

  setKeyListeners() {
    this.cursorKeys = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false),
      down: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        false
      ),
      left: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        false
      ),
      right: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        false
      ),
      space: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        false
      ),
      shift: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SHIFT,
        false
      ),
    };

    this.keyboardKeys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
      R: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R, false),
      E: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E, false),
      SHIFT: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SHIFT,
        false
      ),
    };

    // Space bar for shooting
    this.cursorKeys.space.on("down", () => {
      if (!this.canShoot) {
        return;
      }
      this.inputPayload.shoot = true;
    });

    // Reset shooting on space bar release
    this.cursorKeys.space.on("up", () => {
      this.inputPayload.shoot = false;
    });
  }

  update(time: number, delta: number): void {
    if (!this.currentPlayer) return;

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
    this.inputPayload.shift = this.keyboardKeys.SHIFT.isDown;

    const pointer = this.input.activePointer;

    this.inputPayload.pointer = {
      x: pointer.worldX,
      y: pointer.worldY,
      shoot: pointer.leftButtonDown(),
      reload: pointer.rightButtonDown(),
    };

    if (this.room?.connection?.isOpen && this.enableKeyboard) {
      this.room?.send("input", this.inputPayload);
    }
  }

  setRoomListeners() {
    // Debug navmesh
    if (this.debugging) {
      this.room.state.listen("navMesh", (newValue, previousValue) => {
        console.log(
          "🔄 Received new NavMesh update:",
          JSON.stringify(newValue, null, 2)
        );
        this.drawNavMesh();
      });
    }

    // Add pickups
    this.room.state.pickups.onAdd((pickup) => {
      try {
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

          if (pickup.autoPlay) {
            (pickupEntity as Phaser.GameObjects.Sprite).play(pickup.asset);
          }
        } else {
          pickupEntity = this.add.image(0, 0, pickup.asset);
        }

        if (pickup.tint) {
          pickupEntity.setTint(pickup.tint);
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

          if (!pickup.collisionshape || pickup.collisionshape === "circle") {
            debugBorder = this.add.graphics();
            debugBorder.lineStyle(2, 0xff0000);
            debugBorder.strokeCircle(offsetX, offsetY, pickup.radius);
          } else if (pickup.collisionshape === "box") {
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

        pickup.onChange(() => {
          if (this.pickupEntities[pickup.id]) {
            this.pickupEntities[pickup.id].setAlpha(pickup.opacity);
          }
        });
      } catch (e: any) {
        console.error("Failed to create pickups.");
      }
    });

    // Remove pickups
    this.room.state.pickups.onRemove((pickup) => {
      const sprite = this.pickupEntities[pickup.id]; // Find the sprite associated with the pickup
      if (sprite) {
        sprite.destroy(); // Remove the sprite from the scene
        delete this.pickupEntities[pickup.id]; // Clean up the reference
      }
    });

    // Handle player addition
    this.room.state.players.onAdd((player, sessionId) => {
      try {
        const isCurrentPlayer = sessionId === this.room.sessionId;

        let currentPlayerIndicator: Phaser.GameObjects.Graphics | null = null;
        if (isCurrentPlayer) {
          currentPlayerIndicator = this.add.graphics();
          currentPlayerIndicator.fillStyle(0xffffff, 0.2); // Green with 20% opacity
          currentPlayerIndicator.fillCircle(0, 0, player.playerSize * 1.5);
        }

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

        const pickupContainer = this.add.container(0, -20);

        const containerItems: any = [
          currentPlayerIndicator,
          playerSprite,
          playerNameText,
          healthBarBg,
          healthBar,
          ammoBarBg,
          ammoBar,
          pickupContainer,
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
          containerItems.filter((_) => _)
        );

        if (player.isDead) {
          playerContainer.setVisible(false);
        }

        playerContainer.setSize(playerSprite.width, playerSprite.height);

        playerContainer.setDepth(3);

        playerContainer.setName(sessionId);

        this.playerEntities[sessionId] = playerContainer;

        if (sessionId === this.room.sessionId) {
          this.currentPlayer = playerContainer;
          this.cameras?.main?.startFollow(this.currentPlayer, true);
        }

        // React to player state changes, playeronchange
        player.onChange(() => {
          const container = this.playerEntities[
            sessionId
          ] as Phaser.GameObjects.Container;

          if (container) {
            this.syncPlayerPickups(player, pickupContainer, this);

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
                  ? player.sounds.runningSound
                  : player.sounds.walkingSound
              );*/

                if (
                  playerSprite?.anims &&
                  (playerSprite?.anims?.currentAnim?.key !==
                    `${player.skin}_walk` ||
                    !playerSprite?.anims?.isPlaying)
                ) {
                  playerSprite?.play(`${player.skin}_walk`, true);
                }
              } else {
                if (playerSprite?.anims?.isPlaying) {
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
              ammoBar.fillRect(
                -25,
                -29,
                (player.ammo / player.maxAmmo) * 50,
                2
              );

              playerNameText.setText(`${player.name}`);
            }
          }
        });
      } catch (error: any) {
        console.error("Failed to create players");
      }
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

      this.playSpatialSound(player, player.sounds.onKilledSound);
    });

    // Handle player removal
    this.room.state.players.onRemove((player, sessionId) => {
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

    // Handle bullet addition, add bullets
    this.room.state.bullets.onAdd((bullet, bulletId) => {
      try {
        let bulletEntity: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
        if (bullet.isSprite) {
          bulletEntity = this.add.sprite(bullet.x, bullet.y, bullet.skin);
        } else {
          bulletEntity = this.add.image(bullet.x, bullet.y, bullet.skin);
        }

        bulletEntity.setScale(bullet.scale);
        bulletEntity.setRotation(bullet.rotation + bullet.skinRotation);
        if (bullet.isSprite) {
          (bulletEntity as Phaser.GameObjects.Sprite).play(bullet.skin);
        }

        bulletEntity.setOrigin(0.5, 0.5);
        bulletEntity.setDepth(3);
        this.bulletEntities[bulletId] = bulletEntity;

        bullet.onChange(() => {
          if (this.bulletEntities[bulletId]) {
            this.bulletEntities[bulletId].setPosition(bullet.x, bullet.y);
          }
        });
      } catch (error: any) {
        console.error("Failed to create bullets", error);
      }
    });

    // When a bullet is destroyed
    this.room.onMessage("bullets-destroyed", (destroyedBullets) => {
      destroyedBullets.forEach(({ bullet, pickup, killer, player }) => {
        switch (bullet.colissionType) {
          case "pickup":
            if (!pickup?.disablePlayBulletImpactSound) {
              this.playSpatialSound(
                bullet,
                pickup?.impactSound || bullet.impactOnPickupSound
              );
            }
            this.playAnimation(
              bullet.impactOnPickupAnimation,
              bullet.x,
              bullet.y
            );
            break;

          case "player":
            this.playSpatialSound(bullet, bullet.impactOnPlayerSound);
            this.playAnimation(
              bullet.impactOnPlayerAnimation,
              bullet.x,
              bullet.y
            );
            break;

          case "colissionLayer":
            this.playSpatialSound(bullet, bullet.impactOncollisionsound);
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
      });
    });

    // Remove bullets
    this.room.state.bullets.onRemove((bullet, bulletId) => {
      const bulletEntity = this.bulletEntities[bulletId];
      if (bulletEntity) {
        bulletEntity.destroy();
        delete this.bulletEntities[bulletId];
      }
    });

    // When a sound needs to be played
    this.room.onMessage("play-sound", ({ item, key }) => {
      this.playSpatialSound(item, key);
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
    if (this.anims.exists("explosiongrey")) {
      return;
    }

    this.anims.create({
      key: "snowball",
      frames: this.anims.generateFrameNames("snowball", {
        start: 1,
        end: 6,
        prefix: "snowball_0",
        suffix: ".png",
      }),
      frameRate: 3,
      repeat: 1,
      hideOnComplete: false,
    });

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
    if (!sound || !this.currentPlayer || !target) {
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

    if (!camera) {
      return false;
    }

    // Calculate the screen bounds with offset
    const left = camera.scrollX - offset;
    const right = camera.scrollX + camera.width + offset;
    const top = camera.scrollY - offset;
    const bottom = camera.scrollY + camera.height + offset;

    // Check if the coordinates are within the bounds
    return x >= left && x <= right && y >= top && y <= bottom;
  }

  syncPlayerPickups(
    player: any,
    pickupContainer: Phaser.GameObjects.Container,
    scene: Phaser.Scene
  ) {
    // Clear the container before adding updated pickups
    pickupContainer.removeAll(true); // `true` removes and destroys the current items in the container

    // Loop through the player's pickups
    player.pickups.forEach((pickup) => {
      if (pickup.showOnPlayer) {
        // Create a sprite for the pickup
        const pickupSprite = scene.add.sprite(0, 0, pickup.asset);

        // Optional: Set tint if provided
        if (pickup.tint) {
          pickupSprite.setTint(
            Phaser.Display.Color.HexStringToColor(pickup.tint).color
          );
        }

        // Scale the sprite if necessary
        pickupSprite.setScale(pickup.scaleOnPlayer || 1);

        // Position the sprite (relative to the container, adjust as needed)
        pickupSprite.setPosition(0, -50); // Example: Position above the player

        // Add the sprite to the pickup container
        pickupContainer.add(pickupSprite);
      }
    });
  }
}
