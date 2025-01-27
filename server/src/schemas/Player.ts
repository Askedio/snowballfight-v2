import { Schema, ArraySchema, type } from "@colyseus/schema";
import type { InputData } from "../interfaces/InputData";
import { Pickup } from "./Pickup";

export class Player extends Schema {
  @type("string") sessionId = "";
  @type("string") type = "human";

  // Team based maps
  @type("string") team = ""; // red or blue
  @type("number") score = 0; // Used for team games, ie: ctf = how many flags they captured
  @type("boolean") isReady = false; // Track if the player is dead
  @type("boolean") repsawnDisabled = false; // For TS

  // Position
  @type("number") x = 400;
  @type("number") y = 300;
  @type("number") rotation = 0; // Rotation in radians
  @type("number") hitRadius = 15;
  @type("number") playerRadius = 26; // Player radius for their hitbox
  @type("number") playerSize = 32; // Player size for colissions

  // Stats
  @type("number") defaultHealth = 100;
  @type("number") maxHealth = 100;
  @type("number") health = 100;
  @type("number") kills = 0;
  @type("number") deaths = 0;
  @type("number") tick: number;
  @type("boolean") isDead = true; // Track if the player is dead
  @type("string") name = "";
  @type("string") skin = ""; // Default skin
  @type("number") speed = 4; // The speed the player moves at

  @type("boolean") enabled = true;
  @type("boolean") isMoving = false; // Track if the player is moving

  // Spawn Protection
  @type("boolean") isProtected = false; // Player wont take damage
  @type("number") protectionTime = 3000; // How long they are protected for
  @type("number") respawnDelay = 5; // How long to wait before allowing player to respawn
  @type("number") lastKilledAt: number;
  @type("boolean") isRespawnable = false; // eh..

  // Firing rate/damage
  @type("number") bulletSpeed = 10; // How fast the bullet moves
  @type("number") bulletCooldown = 400; // Time between actually firing
  @type("number") bulletFireRate = 1; // Number of bullets to fire
  @type("number") bulletFireDelay = 100; // Time between bullet fires.
  @type("number") bulletDamage = 20; // The damage caused by the bullet

  // Ammo
  @type("number") ammo = 20;
  @type("number") previousAmmo = 20;
  @type("number") defaultAmmo = 20;
  @type("number") maxAmmo = 50;
  @type("boolean") ammoUnlimited = false;
  @type("boolean") defaultAmmoUnlimited = false;

  // Reloading
  @type("number") reloadAmount = 2;
  @type("number") reloadDelay = 500;
  @type("number") reloadPlayerSpeed = 2;
  @type("number") lastReloadTime = 0;

  // Sounds
  @type("string") onKilledSound = "smash1";
  @type("string") walkingSound = "footstep1";
  @type("string") runningSound = "footstep1";
  @type("string") rKeySound: string;
  @type("string") eKeySound: string;

  // Animations
  @type("string") onKilledAnimation = "explosiongrey";
  @type("string") onLeftMapAnimation = "explosiongrey";

  // Used for applyTemporaryChange
  @type("number") defaultSpeed = 4;
  @type("number") defaultBulletSpeed = 10;
  @type("number") defaultBulletCooldown = 400;
  @type("number") defaultBulletFireRate = 1;
  @type("number") defaultBulletFireDelay = 100;

  // Bots
  @type("number") lastRandomMoveTime: number;
  @type("number") randomMoveCooldown = 300;
  @type("number") randomPointerX = 0;
  @type("number") randomPointerY = 0;
  @type("string") targetPlayer: string;

  // Carry pickup
  @type(Pickup) carriedPickup: Pickup; // ahh..
  @type([Pickup]) pickups = new ArraySchema<Pickup>();

  // Chat
  @type("number") lastChatted: number;

  lastBulletTime = 0; // Track the last time a bullet was fired
  inputQueue: InputData[] = [];

  canRespawn(): boolean {
    if(this.repsawnDisabled) {
      return false;
    }
    
    if (!this.lastKilledAt) {
      return true;
    }

    const now = Date.now(); // Current time
    return now - this.lastKilledAt >= this.respawnDelay;
  }

  /**
   * Reset the player to default settings.
   */
  reset() {
    this.ammo = this.defaultAmmo;
    this.speed = this.defaultSpeed;
    this.health = this.defaultHealth;
    this.deaths = 0;
    this.kills = 0;
    this.score = 0;
    this.isDead = false;

    this.bulletSpeed = this.defaultBulletSpeed;
    this.bulletCooldown = this.defaultBulletCooldown;
    this.bulletFireRate = this.defaultBulletFireRate;
    this.bulletFireDelay = this.defaultBulletFireDelay;
    this.ammoUnlimited = this.defaultAmmoUnlimited;
  }

  respawn() {
    this.ammo = this.defaultAmmo;
    this.speed = this.defaultSpeed;
    this.health = this.defaultHealth;
    this.isDead = false;

    this.bulletSpeed = this.defaultBulletSpeed;
    this.bulletCooldown = this.defaultBulletCooldown;
    this.bulletFireRate = this.defaultBulletFireRate;
    this.bulletFireDelay = this.defaultBulletFireDelay;
    this.ammoUnlimited = this.defaultAmmoUnlimited;
  }

  resetTimeouts: Map<string, NodeJS.Timeout> = new Map<
    string,
    NodeJS.Timeout
  >();

  /**
   * Apply a temporary change to a player's property.
   * @param key The property to change.
   * @param value The temporary value to apply.
   * @param duration Duration in milliseconds before resetting to the default value.
   */
  applyTemporaryChange<K extends keyof this>(
    key: K,
    value: this[K],
    duration: number,
    manulValue?: any
  ): void {
    const keyString = String(key); // Convert key to string for map operations

    // Clear existing timeout if already set for this key
    if (this.resetTimeouts.has(keyString)) {
      const timeout = this.resetTimeouts.get(keyString);
      if (timeout) {
        clearTimeout(timeout);
      }
    }

    // Apply the temporary value
    this[key] = value;

    // Schedule a reset to the default value
    const timeout = setTimeout(() => {
      const defaultKey = `default${
        keyString.charAt(0).toUpperCase() + keyString.slice(1)
      }` as keyof this;

      if (manulValue) {
        this[key] = manulValue;
      } else {
        // Reset to default if defaultKey exists
        if (defaultKey in this) {
          // @ts-ignore
          this[key] = this[defaultKey];
        }
      }

      // Clean up the timeout
      this.resetTimeouts.delete(keyString);
    }, duration);

    // Store the timeout reference
    this.resetTimeouts.set(keyString, timeout);
  }
}
