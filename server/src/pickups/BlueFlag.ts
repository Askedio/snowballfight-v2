import { Pickup } from "../schemas/Pickup";
import type { Player } from "../schemas/Player";

export class BlueFlagPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("blueFlag", config.x || 0, config.y || 0);
    Object.assign(this, config);

    this.isSprite = true;
    this.scale = 0.7;
    this.scaleOnPlayer = 0.3;
    this.autoPlay = true;
    this.tint = "0x0000ff";
    this.asset = "flag";
    
    this.destroyOnCollision = true;
    this.isRedeployable = false;
    this.dropOffLocation = "redFlag";
    this.showOnPlayer = true;
  }

  canCarry(player: Player): boolean {
    return player.team === "red";
  }

  onPlayerCollision(player: any): void {
    this.destroyOnCollision = player.team !== "blue";
  }

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
