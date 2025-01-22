import { Schema, type } from "@colyseus/schema";

export class Pickup extends Schema {
  @type("string") id: string; // Unique identifier

  @type("string") asset: string;

  @type("string") spawnTile: string;

  @type("string") type: string; // e.g., 'devil', 'skull', etc.
  @type("boolean") isSprite = false;
  @type("string") spriteFrame: string;

  @type("number") x: number; // Spawn position X
  @type("number") y: number; // Spawn position Y
  @type("number") rotation: number;
  @type("number") radius = 16;

  @type("boolean") destroyable = true; // Can this pickup be destroyed?
  @type("boolean") blocking = false; // Does it block player movement?
  @type("boolean") bulletKills = false; // Can bullets destroy it?
  @type("boolean") killOnCollision = false; // Destroyed when a player collides
  @type("boolean") destroyOnCollision = false; // Destroyed when a player collides
  @type("boolean") destroyBulletOnCollision = false; // Bullet is destroyed on collision

  @type("number") health = 100; // Health of the pickup (if destroyable)
  @type("string") explosionType = "default"; // Optional: explosion effect
  @type("boolean") alwaysPlay = false; // Optional: always active
  @type("boolean") stopsPlayer = false; // Stops player movement when collided
  @type("boolean") isRedeployable = true; // Can this pickup redeploy?
  @type("number") redeployTimeout = 500; // Time in ms before redeploying
  @type("number") scale = 0.08; // Time in ms before redeploying
  @type("number") width: number;
  @type("number") height: number;

  @type("boolean") disablePlayBulletKillSound = false;
  @type("boolean") bringToTop = false;

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
