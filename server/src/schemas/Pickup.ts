import { Schema, type } from "@colyseus/schema";
import type { Player } from "./Player";

export class Pickup extends Schema {
  @type("string") id: string; // Unique identifier
  @type("string") type: string; // e.g., 'devil', 'skull', etc.

  // Display
  @type("boolean") isSprite = false;
  @type("boolean") showOnPlayer = false;
  @type("boolean") autoPlay = false;
  @type("string") spriteFrame: string;
  @type("string") tint: string;
  @type("string") asset: string;
  @type("string") spawnTile: string;

  // Position
  @type("number") x: number; // Spawn position X
  @type("number") y: number; // Spawn position Y
  @type("number") originalX: number; // Spawn position X
  @type("number") originalY: number; // Spawn position Y
  @type("number") scale = 0.08;
  @type("number") scaleOnPlayer = 0.04;
  @type("number") width: number;
  @type("number") height: number;
  @type("number") rotation: number;
  @type("number") radius = 12; // The size of the pickup collision zone
  @type("string") collisionshape: string; // The following are used for colission detection
  @type("number") colissionOffsetX: number;
  @type("number") colissionOffsetY: number;
  @type("number") colissionWidth: number;
  @type("number") colissionHeight: number;
  @type("boolean") bringToTop = false; // Place this above players

  // Stats
  @type("number") health = 100; // How much health this item has
  @type("number") damange = 20; // How much damage a bullet does to this item

  // Settings
  @type("boolean") destroyable = true; // Can this pickup be destroyed?
  @type("boolean") blocking = false; // Does it block player movement?
  @type("boolean") bulletKills = false; // Can bullets destroy it?
  @type("boolean") destroyOnCollision = false; // Destroyed when a player collides
  @type("boolean") destroyBulletOnCollision = false; // Bullet is destroyed on collision

  // Redeploy
  @type("boolean") isRedeployable = true; // Can this pickup redeploy?
  @type("number") redeployTimeout = 500; // Time in ms before redeploying

  // Sounds
  @type("string") impactSound: ""; // The sound playing when impacted, not used here
  @type("boolean") disablePlayBulletImpactSound = false; // Disable playing the sound
  @type("boolean") playAudioOnPickup = false; // Play sound when picked up
  @type("string") audioKey: string; // The audio key for the sound to play when picked up

  // Carry pickup
  @type("string") dropOffLocation: string; // The location where this item will be dropped off, ie: capture point
  @type("boolean") wasDropped = false; // Was picked up then it was dropped.


  constructor(type: string, x: number, y: number) {
    super();
    this.type = type;
    this.x = x;
    this.y = y;
  }

  canCarry(player: Player): boolean {
    return false
  }

  onPlayerCollision(player: Player): void {}

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
