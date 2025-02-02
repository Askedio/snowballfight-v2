import { Player } from "../schemas/Player";
import type { InputData } from "../interfaces/InputData";
import type { Pickup } from "../schemas/Pickup";
import { SpatialPartitioningManager } from "./SpatialPartitioningManager";
import { BaseRoom } from "../rooms/BaseRoom";
import { BaseRoomState } from "../states/BaseRoomState";
import { BotState, TargetType, WanderState } from "./BotStateManager";

const healthPickup = "treasure";
const ammoPickup = "devil";

const combatDistance = 200;

export class BotManager {
  private room: BaseRoom<BaseRoomState>;
  spatialManager: SpatialPartitioningManager;

  // These hold the current bot and its state.
  private bot!: Player;
  private state!: BotState;
  private lastState!: BotState;

  constructor(
    spatialManager: SpatialPartitioningManager,
    room: BaseRoom<BaseRoomState>
  ) {
    this.spatialManager = spatialManager;
    this.room = room;
  }

  // --- Helper: ensure the target has numeric x and y ---
  private isValidTarget(
    target: TargetType
  ): target is { x: number; y: number } {
    return (
      target !== null &&
      typeof (target as any).x === "number" &&
      typeof (target as any).y === "number"
    );
  }

  // --- Main run() ---
  run(bot: Player): InputData {
    this.bot = bot;
    this.state = this.room.botStateManager.get(
      this.bot.sessionId,
      "state",
      BotState.Wandering
    );

    this.lastState = this.room.botStateManager.get(
      this.bot.sessionId,
      "lastState",
      BotState.Wandering
    );

    // Evaluate the situation: pickups, being shot, and enemy presence.
    this.evaluateSituation();

    // Delegate to the appropriate update function based on state.
    switch (this.state) {
      case BotState.Combat:
        this.updateCombat();
        break;

      case BotState.Fleeing:
        this.updateFleeing();
        break;
      case BotState.TargetingPickup:
        this.updateTargetingPickup();
        break;
      case BotState.Wandering:
        this.updateWandering();
      default:
        this.updateWandering();
        break;
    }

    // Finally, steer using the unified target.
    return this.steer();
  }

  // --- Situation Evaluation ---
  private evaluateSituation(): void {
    // (1) If health or ammo is low, try to target a pickup.
    //|| this.bot.ammo < 5
    // || pickup.type === ammoPickup
    if (this.bot.health <= 40) {
      const pickup = this.getNearestPickup(
        (pickup) => pickup.type === healthPickup
      );
      if (pickup) {
        this.changeLastState(this.state);
        this.changeState(BotState.TargetingPickup);
        this.setTarget(pickup);
        return;
      }
    }

    // (2) If the bot was shot and we don’t have a valid Player target, switch to Combat.
    if (this.bot.shotBy && this.state !== BotState.Fleeing) {
      const stored = this.room.botStateManager.get(
        this.bot.sessionId,
        "target",
        null
      );
      if (!stored || !(stored instanceof Player)) {
        const attacker = this.room.state.players.get(this.bot.shotBy);
        if (attacker && attacker.canBeAttacked()) {
          this.changeLastState(this.state);
          this.changeState(BotState.Combat);
          this.setTarget(attacker);
          return;
        }
      }
    }

    // (3) If wandering and a nearby enemy exists, switch to Combat.
    if (this.state === BotState.Wandering) {
      const enemy = this.getNearestEnemy();
      if (enemy?.canBeAttacked()) {
        this.changeLastState(this.state);
        this.changeState(BotState.Combat);
        this.setTarget(enemy);
        return;
      }
    }
    // Otherwise, keep the current state.
  }

  // --- Behavior Update Functions ---
  private updateWandering() {
    const sessionId = this.bot.sessionId;
    let target = this.room.botStateManager.get(
      sessionId,
      "target",
      null
    ) as TargetType;
    // If no valid target, pick a random available tile at least 150px away.
    if (!this.isValidTarget(target)) {
      const { chosenTile } = this.pickRandomAvailableTile(300);
      if (!chosenTile) return; // fallback: use current position
      const dx = chosenTile.x - this.bot.x;
      const dy = chosenTile.y - this.bot.y;
      const angle = Math.atan2(dy, dx);
      target = {
        x: chosenTile.x,
        y: chosenTile.y,
        angle,
        lastUpdate: Date.now(),
      };
      this.changeState(BotState.Wandering);
      this.setTarget(target);
    }
    // If the bot is near the wandering target (e.g. within 50px), clear the target so a new one is chosen.
    const d = Math.hypot(this.bot.x - target.x, this.bot.y - target.y);
    if (d < 50) {
      this.changeState(BotState.Wandering);

      this.clearTarget();
    }
  }

  private updateCombat() {
    // In Combat, ensure the target is a valid Player.
    let target = this.getLastPlayerTarget();

    if (!target?.canBeAttacked()) {
      this.clearLastPlayerTarget();
      this.changeLastState(BotState.Wandering);

      const enemy = this.getNearestEnemy();
      if (enemy?.canBeAttacked()) {
        target = enemy;
        this.setTarget(enemy);
        this.setLastPlayerTarget(enemy);
      } else {
        this.updateWandering();
        this.clearLastPlayerTarget();
        return;
      }
    }
    const d = Math.hypot(this.bot.x - target.x, this.bot.y - target.y);
    if (d < combatDistance) {
      // If enemy is too close, store it as the last enemy target and switch to fleeing.
      this.setLastPlayerTarget(target as Player);
      this.setFleeing();
    }
  }

  private updateFleeing(): void {
    // Check if we have a stored last enemy target.
    const lastEnemy = this.getLastPlayerTarget();

    if (lastEnemy?.canBeAttacked()) {
      const d = Math.hypot(this.bot.x - lastEnemy.x, this.bot.y - lastEnemy.y);
      // If we've successfully fled and the enemy is now more than 200 pixels away,
      // and the enemy is still valid, resume combat.
      if (d > combatDistance * 2) {
        console.log("Resuming combat with stored enemy.");
        this.changeState(BotState.Combat);
        this.setTarget(lastEnemy);
        this.clearLastPlayerTarget();
      }
    } else {
      this.clearLastPlayerTarget();
      this.changeLastState(BotState.Wandering);
    }
  }

  setFleeing() {
    const { chosenTile } = this.pickRandomAvailableTile(500);
    if (chosenTile) {
      this.changeLastState(this.state);

      this.changeState(BotState.Fleeing);
      this.setTarget(chosenTile);
    }
  }

  private updateTargetingPickup() {
    // In TargetingPickup, continue moving toward the pickup.
    let target = this.room.botStateManager.get(
      this.bot.sessionId,
      "target",
      null
    );
    if (!this.isValidTarget(target)) {
      this.updateWandering();
      return;
    }
    const d = Math.hypot(this.bot.x - target.x, this.bot.y - target.y);
    if (d < this.bot.playerRadius * 0.5) {
      // Reached the pickup – clear the target and revert to wandering.
      this.clearTarget();
      this.updateWandering();
      return;
    }
  }

  // --- State Manager Helpers ---
  private changeState(newState: BotState): void {
    this.state = newState;
    this.room.botStateManager.set(this.bot.sessionId, "state", newState);
  }
  private changeLastState(newState: BotState): void {
    this.lastState = newState;
    this.room.botStateManager.set(this.bot.sessionId, "lastState", newState);
  }
  private setTarget(target: TargetType): void {
    this.room.botStateManager.set(this.bot.sessionId, "target", target);
  }
  private clearTarget(): void {
    this.room.botStateManager.set(this.bot.sessionId, "target", null);
  }

  // --- Target-Finding Helpers ---
  private getNearestEnemy(): Player | null {
    let best: Player | null = null;
    let bestScore = -Infinity;
    const nearby = this.spatialManager.queryNearbyObjects(
      this.bot.x,
      this.bot.y,
      400,
      this.spatialManager.playerIndex
    );
    nearby.forEach(({ player }) => {
      if (
        player.sessionId !== this.bot.sessionId &&
        !player.isDead &&
        !player.isProtected
      ) {
        const d = Math.hypot(this.bot.x - player.x, this.bot.y - player.y);
        const score = 100 - player.health + (200 - d);
        if (score > bestScore) {
          bestScore = score;
          best = player;
        }
      }
    });
    return best;
  }

  private getNearestPickup(
    condition: (pickup: Pickup) => boolean
  ): Pickup | null {
    let best: Pickup | null = null;
    let bestScore = Infinity;
    const nearby = this.spatialManager.queryNearbyObjects(
      this.bot.x,
      this.bot.y,
      500,
      this.spatialManager.pickupIndex
    );
    nearby.forEach(({ pickup }) => {
      if (condition(pickup)) {
        const d = Math.hypot(this.bot.x - pickup.x, this.bot.y - pickup.y);
        if (d < bestScore) {
          bestScore = d;
          best = pickup;
        }
      }
    });
    return best;
  }

  /**
   * Attempts to pick a random available tile (with an optional minimum distance)
   * that yields a valid path.
   */
  private pickRandomAvailableTile(minDistance: number = 0): {
    chosenTile: { x: number; y: number } | null;
    computedPath: { x: number; y: number }[];
  } {
    const availableTiles = this.room.mapManager.availableTiles;
    if (!availableTiles || availableTiles.length === 0) {
      console.warn("No available tiles found!");
      return { chosenTile: null, computedPath: [] };
    }
    let attempts = 0;
    let chosenTile: { x: number; y: number } | null = null;
    let computedPath: { x: number; y: number }[] = [];
    while (attempts < 5) {
      const randomIndex = Math.floor(Math.random() * availableTiles.length);
      chosenTile = availableTiles[randomIndex];
      if (minDistance > 0) {
        const d = Math.hypot(
          this.bot.x - chosenTile.x,
          this.bot.y - chosenTile.y
        );
        if (d < minDistance) {
          attempts++;
          continue;
        }
      }
      computedPath = this.room.mapManager.findPath(
        this.bot.x,
        this.bot.y,
        chosenTile.x,
        chosenTile.y
      );
      if (computedPath.length > 0) break;
      attempts++;
    }
    if (!chosenTile) {
      return { chosenTile: null, computedPath: [] };
    }
    if (computedPath.length === 0) {
      console.warn(
        `No valid path found after ${attempts} attempts; forcing fallback using last chosen tile.`
      );
      computedPath = [{ x: chosenTile.x, y: chosenTile.y }];
    }
    return { chosenTile, computedPath };
  }

  // --- Pathfinding & Steering ---
  /**
   * steer(): Uses the unified target from state to calculate a path,
   * move the bot, adjust its rotation, and optionally decide whether to shoot.
   * This is the only function run() calls.
   */
  private steer(): InputData {
    const target = this.room.botStateManager.get(
      this.bot.sessionId,
      "target",
      null
    );
    if (!this.isValidTarget(target)) {
      this.changeLastState(BotState.Wandering);
      return this.stopMoving();
    }

    return this.steerCustom(target.x, target.y);
  }

  /**
   * steerCustom(): Steers toward explicit target coordinates.
   */
  private steerCustom(
    targetX: number,
    targetY: number,
    isShooting: boolean = false
  ): InputData {
    const currentX = this.bot.x;
    const currentY = this.bot.y;
    const sessionId = this.bot.sessionId;

    // Get the stored target and lastPlayerTarget from state.
    const stored = this.room.botStateManager.get(sessionId, "target", null);
    const lastPlayerTarget = this.room.botStateManager.get(
      sessionId,
      "lastPlayerTarget",
      null
    );

    let rotationType = "target";
    // Determine the desired rotation based on the target type.
    let desiredRotation: number;
    if (stored && stored instanceof Player) {
      rotationType = "player";
      // If targeting a player, always rotate toward the player's current position.
      desiredRotation = Math.atan2(
        stored.y - this.bot.y,
        stored.x - this.bot.x
      );
    } else if (this.state === BotState.Fleeing && lastPlayerTarget) {
      // If fleeing, rotate toward the last enemy target.
      rotationType = "target player";
      desiredRotation = Math.atan2(
        lastPlayerTarget.y - this.bot.y,
        lastPlayerTarget.x - this.bot.x
      );
    } else {
      rotationType = "target";
      // Otherwise, use the passed-in target coordinates.
      desiredRotation = Math.atan2(targetY - this.bot.y, targetX - this.bot.x);
    }

    // Smoothly update the bot's rotation based on desiredRotation.
    this.bot.rotation = this.bot.smoothAngle(
      this.bot.rotation,
      desiredRotation,
      0.1
    );

    // --- Path recalculation and movement section ---
    let botPath = this.room.botStateManager.get(sessionId, "path", []);
    let lastTarget = this.room.botStateManager.get(
      sessionId,
      "lastTarget",
      null
    );
    if (!lastTarget) {
      lastTarget = { x: targetX, y: targetY };
    }
    if (
      Math.hypot(lastTarget.x - targetX, lastTarget.y - targetY) > 100 ||
      botPath.length === 0
    ) {
      this.room.botStateManager.set(sessionId, "lastTarget", {
        x: targetX,
        y: targetY,
      });
      try {
        const computedPath = this.room.mapManager.findPath(
          currentX,
          currentY,
          targetX,
          targetY
        );
        this.room.botStateManager.set(sessionId, "path", computedPath);
        botPath = computedPath;
      } catch (e) {
        console.error("Pathfinding error:", e);
      }
    }

    if (botPath.length > 0) {
      const nextStep = botPath[0];
      if (
        !nextStep ||
        typeof nextStep.x !== "number" ||
        typeof nextStep.y !== "number"
      ) {
        console.log("stopped");
        this.room.botStateManager.shiftPath(sessionId);
        return this.stopMoving();
      }
      let dx = nextStep.x - this.bot.x;
      let dy = nextStep.y - this.bot.y;
      let distance = Math.hypot(dx, dy);
      desiredRotation = Math.atan2(dy, dx);

      if (isNaN(distance) || distance < this.bot.playerRadius * 0.5) {
        this.room.botStateManager.shiftPath(sessionId);
        // If the target is reached, clear the target.
        this.clearTarget();
        return this.stopMoving();
      } else {
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          // The bot is moving.
        }
        const speed = this.bot.speed || 2;
        const moveX = (dx / distance) * speed;
        const moveY = (dy / distance) * speed;
        this.bot.x += moveX;
        this.bot.y += moveY;
      }

      this.bot.isMoving = Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1;

      // Instead of recalculating rotation from the movement vector here,
      // we already computed desiredRotation above.
      // (Optionally, if the bot is moving, you might blend the two.)
      // For now, we use our desiredRotation as computed.
      if (rotationType === "target") {
        this.bot.rotation = this.bot.smoothAngle(
          this.bot.rotation,
          desiredRotation,
          0.1
        );
      }

      // Optionally, calculate angleDiff and shooting conditions.
      const rawAngleDiff = Math.abs(desiredRotation - this.bot.rotation);
      const angleDiff =
        rawAngleDiff > Math.PI ? 2 * Math.PI - rawAngleDiff : rawAngleDiff;
      const shootThreshold = 0.2;
      const targetDistance = Math.hypot(
        targetX - this.bot.x,
        targetY - this.bot.y
      );
      const canShoot =
        [BotState.Combat, BotState.Fleeing].includes(this.state) &&
        Math.random() > 0.5 &&
        angleDiff < shootThreshold &&
        targetDistance < 400;

      return {
        up: dy < 0,
        down: dy > 0,
        left: dx < 0,
        right: dx > 0,
        pointer: { x: targetX, y: targetY },
        r: false,
        shoot: canShoot,
      };
    }
    return this.stopMoving();
  }

  private stopMoving(): InputData {
    // reset to what the bot was doing before it hit its
    this.changeState(this.lastState);
    const lastPlayerTarget = this.room.botStateManager.get(
      this.bot.sessionId,
      "lastPlayerTarget",
      null
    );
    this.bot.isMoving = false;

    // maybe we goto last state before the change?

    const { canReload, canShoot } = this.canShootOrReload();

    return {
      up: false,
      down: false,
      left: false,
      right: false,
      pointer: { x: lastPlayerTarget?.x || 0, y: lastPlayerTarget?.y || 0 },
      r: canReload,
      shoot: canShoot,
    };
  }

  private canShootOrReload(): { canShoot: boolean; canReload: boolean } {
    const reloadThreshold = Math.random() < 0.5 ? 5 : 10;
    const isReloading =
      this.bot.ammo <= reloadThreshold ||
      (this.state === BotState.Wandering && this.bot.ammo < 40);

    const lastPlayerTarget = this.room.botStateManager.get(
      this.bot.sessionId,
      "lastPlayerTarget",
      null
    );

    if (!lastPlayerTarget) {
      return {
        canShoot: false,
        canReload: isReloading,
      };
    }

    const targetDistance = Math.hypot(
      lastPlayerTarget.x - this.bot.x,
      lastPlayerTarget.y - this.bot.y
    );

    const canShoot =
      [BotState.Combat, BotState.Fleeing].includes(this.state) &&
      !isReloading &&
      targetDistance < 400;

    return {
      canReload: isReloading,
      canShoot: canShoot,
    };
  }

  private setLastPlayerTarget(player: Player): void {
    this.room.botStateManager.set(
      this.bot.sessionId,
      "lastPlayerTarget",
      player
    );
  }

  private getLastPlayerTarget(): Player | null {
    const target = this.room.botStateManager.get(
      this.bot.sessionId,
      "lastPlayerTarget",
      null
    );
    return target && target instanceof Player ? target : null;
  }

  private clearLastPlayerTarget(): void {
    this.room.botStateManager.set(this.bot.sessionId, "lastPlayerTarget", null);
  }
}
