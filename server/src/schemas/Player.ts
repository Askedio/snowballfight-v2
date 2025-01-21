import { Schema, type } from "@colyseus/schema";
import type { InputData } from "../interfaces/InputData";

export class Player extends Schema {
  @type("number") x = 400;
  @type("number") y = 300;
  @type("number") rotation = 0; // Rotation in radians
  @type("number") health = 100;
  @type("number") kills = 0;

  @type("number") deaths = 0;
  @type("number") tick: number;
  @type("boolean") isDead = false; // Track if the player is dead
  @type("string") name = "";
  @type("string") skin = ""; // Default skin
  @type("boolean") isMoving = false; // Track if the player is moving

  @type("number") speed = 4;
  @type("number") bulletSpeed = 10;
  @type("number") bulletCooldown = 400;

  @type("number") defaultSpeed = 4;
  @type("number") defaultBulletSpeed = 10;
  @type("number") defaultBulletCooldown = 400;

  lastBulletTime = 0; // Track the last time a bullet was fired
  inputQueue: InputData[] = [];

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
    duration: number
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

      // Reset to default if defaultKey exists
      if (defaultKey in this) {
        // @ts-ignore
        this[key] = this[defaultKey];
      }

      // Clean up the timeout
      this.resetTimeouts.delete(keyString);
    }, duration);

    // Store the timeout reference
    this.resetTimeouts.set(keyString, timeout);
  }
}
