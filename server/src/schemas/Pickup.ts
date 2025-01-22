import { Schema, type } from "@colyseus/schema";

export class Pickup extends Schema {
  @type("string") id: string; // Unique identifier

  @type("string") type: string; // e.g., 'devil', 'skull', etc.
  @type("boolean") isSprite = false;
  @type("string") spriteFrame: string;
  @type("string") asset: string;
  @type("string") spawnTile: string;

  @type("number") x: number; // Spawn position X
  @type("number") y: number; // Spawn position Y
  @type("number") rotation: number;

  @type("number") health = 100; // How much health this item has
  @type("number") damange = 20; // How much damage a bullet does to this item

  @type("number") radius = 12; // The size of the pickup collision zone

  @type("string") colissionShape: string;
  @type("number") colissionOffsetX: number;
  @type("number") colissionOffsetY: number;

  @type("number") colissionWidth: number;
  @type("number") colissionHeight: number;

  @type("boolean") destroyable = true; // Can this pickup be destroyed?
  @type("boolean") blocking = false; // Does it block player movement?
  @type("boolean") bulletKills = false; // Can bullets destroy it?
  @type("boolean") destroyOnCollision = false; // Destroyed when a player collides
  @type("boolean") destroyBulletOnCollision = true; // Bullet is destroyed on collision

  @type("string") explosionType = "default"; // Optional: explosion effect
  @type("boolean") disablePlayBulletKillSound = false;

  @type("boolean") alwaysPlay = false; // Optional: always active

  @type("boolean") isRedeployable = true; // Can this pickup redeploy?
  @type("number") redeployTimeout = 500; // Time in ms before redeploying

  @type("number") scale = 0.08; // Time in ms before redeploying
  @type("number") width: number;
  @type("number") height: number;

  @type("boolean") bringToTop = false;

  @type("boolean") playAudioOnPickup = false;
  @type("string") audioKey: string;

  constructor(type: string, x: number, y: number) {
    super();
    this.type = type;
    this.x = x;
    this.y = y;
  }

  onPlayerCollision(player: any): void {}

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
