import { Pickup } from "../schemas/Pickup";
import { Player } from "../schemas/Player";

export enum BotState {
  Wandering,
  Combat,
  Fleeing,
  TargetingPickup,
  Stopped,
}

export type WanderState = {
  x: number;
  y: number;
  angle: number;
  lastUpdate: number;
};
export type XY = { x: number; y: number };

export type TargetType = null | Pickup | Player | WanderState | XY;

type BotStateData = {
  path: { x: number; y: number }[];
  state: BotState;
  lastState?: BotState;
  isMoving: boolean;
  lastUpdate: number;
  combatTimer?: number;
  wanderState?: WanderState;
  target?: TargetType;
  lastTarget?: XY;
  lastPlayerTarget?: Player;
};

export class BotStateManager {
  public botState: Map<string, BotStateData>;

  constructor() {
    this.botState = new Map();
  }

  /** ✅ Retrieves or initializes the bot state */
  private ensureState(sessionId: string): BotStateData {
    if (!this.botState.has(sessionId)) {
      this.botState.set(sessionId, {
        path: [],
        state: BotState.Wandering,
        isMoving: false,
        lastTarget: { x: 0, y: 0 },
        lastUpdate: Date.now(),
      });
    }
    return this.botState.get(sessionId)!;
  }

  /** ✅ Generic setter for bot state properties */
  set<K extends keyof BotStateData>(
    sessionId: string,
    key: K,
    value: BotStateData[K]
  ) {
    const state = this.ensureState(sessionId);
    state[key] = value;
    state.lastUpdate = Date.now();
  }

  /** ✅ Generic getter for bot state properties */
  get<K extends keyof BotStateData>(
    sessionId: string,
    key: K,
    defaultValue: BotStateData[K]
  ): BotStateData[K] {
    return this.botState.get(sessionId)?.[key] ?? defaultValue;
  }

  /** ✅ Removes old bot states after expiration */
  cleanupOldPaths(expirationTime: number = 10000) {
    const now = Date.now();
    for (const [sessionId, state] of this.botState) {
      if (now - state.lastUpdate > expirationTime) {
        this.botState.delete(sessionId);
      }
    }
  }

  /** ✅ Clears all bot states */
  clearAll() {
    this.botState.clear();
  }

  /** ✅ Clears a single bot state */
  clear(sessionId: string) {
    this.botState.delete(sessionId);
  }

  /** ✅ Shifts the next waypoint in the bot's path */
  shiftPath(sessionId: string) {
    const path = this.get(sessionId, "path", []);
    if (path.length > 0) {
      path.shift(); // Remove the first waypoint
      this.set(sessionId, "path", path);
      this.set(sessionId, "isMoving", path.length > 0);
    }
  }
}
