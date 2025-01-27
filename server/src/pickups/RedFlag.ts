import { Pickup } from "../schemas/Pickup";
import type { Player } from "../schemas/Player";

export class RedFlagPickup extends Pickup {
  constructor(config: Partial<Pickup>) {
    super("redFlag", config.x || 0, config.y || 0);
    Object.assign(this, config);

    this.isSprite = true;

    this.scale = 0.7;
    this.autoPlay = true;
    this.tint = "0xff0000";

    this.asset = "flag";
    this.destroyOnCollision = true;
    this.isRedeployable = false;

    this.dropOffLocation = "blueFlag";
    this.showOnPlayer = true;
  }

  canCarry(player: Player): boolean {
    return player.team === "blue";

  }

  onPlayerCollision(player: any): void {
    //
  }

  onBulletCollision(): boolean {
    return this.bulletKills;
  }
}
