import { Schema, type } from "@colyseus/schema";

export class Pickup extends Schema {
  @type("string") type: string; // e.g., 'devil', 'skull', etc.
  @type("number") x: number; // Spawn position X
  @type("number") y: number; // Spawn position Y
  @type("boolean") destroyable = true; // Can this pickup be destroyed?
  @type("boolean") blocking = false; // Does it block player movement?
  @type("boolean") bulletKills = false; // Can bullets destroy it?
  @type("boolean") killOnCollision = false; // Destroyed when a player collides
  @type("boolean") destroyOnCollision = false; // Destroyed when a player collides
  @type("boolean") killBulletOnCollision = false; // Bullet is destroyed on collision
  @type("number") health = 100; // Health of the pickup (if destroyable)
  @type("string") explosionType = "default"; // Optional: explosion effect
  @type("boolean") alwaysPlay = false; // Optional: always active
  @type("boolean") stopsPlayer = false; // Stops player movement when collided
  @type("string") asset: string; // Asset file path for rendering
  @type("string") id: string; // Unique identifier
  @type("boolean") isRedeployable = true; // Can this pickup redeploy?
  @type("number") redeployTimeout = 500; // Time in ms before redeploying

  constructor(type: string, x: number, y: number, asset: string) {
    super();
    this.type = type;
    this.x = x;
    this.y = y;
    this.asset = asset;
  }

  onPlayerCollision(player: any): void {}

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
