export enum BotState {
    Wandering,
    Chasing,
    Combat,
    Fleeing,
  }
  
  export class BotStateManager {
       botState: { 
          [sessionId: string]: { 
              path: { x: number; y: number }[], 
              state: BotState, 
              targetPlayer: string | null,
              isMoving: boolean,
              lastTargetX: number,
              lastTargetY: number,
              lastUpdate: number 
          } 
      };
  
      constructor() {
          this.botState = {};
      }
  
      /** ✅ Sets a new path (Only Updates Path) */
      setPath(sessionId: string, path: { x: number; y: number }[]) {
          if (!this.botState[sessionId]) this.botState[sessionId] = this.createDefaultBotState();
          this.botState[sessionId].path = path;
          this.botState[sessionId].isMoving = path.length > 0;
          this.botState[sessionId].lastUpdate = Date.now();
      }
  
      /** ✅ Retrieves the bot's path */
      getPath(sessionId: string): { x: number; y: number }[] {
          return this.botState[sessionId]?.path || [];
      }
  
      /** ✅ Shifts the next waypoint */
      shiftPath(sessionId: string) {
          if (this.botState[sessionId]?.path.length) {
              this.botState[sessionId].path.shift();
              this.botState[sessionId].isMoving = this.botState[sessionId].path.length > 0;
          }
      }
  
      /** ✅ Clears the bot's path */
      clearPath(sessionId: string) {
          if (this.botState[sessionId]) {
              this.botState[sessionId].path = [];
              this.botState[sessionId].isMoving = false;
          }
      }
  
      /** ✅ Sets bot state */
      setState(sessionId: string, state: BotState) {
          if (!this.botState[sessionId]) this.botState[sessionId] = this.createDefaultBotState();
          this.botState[sessionId].state = state;
          this.botState[sessionId].lastUpdate = Date.now();
      }
  
      /** ✅ Retrieves bot state */
      getState(sessionId: string): BotState {
          return this.botState[sessionId]?.state || BotState.Wandering;
      }
  
      /** ✅ Sets whether bot is moving */
      setIsMoving(sessionId: string, isMoving: boolean) {
          if (!this.botState[sessionId]) this.botState[sessionId] = this.createDefaultBotState();
          this.botState[sessionId].isMoving = isMoving;
      }
  
      /** ✅ Retrieves bot moving status */
      isMoving(sessionId: string): boolean {
          return this.botState[sessionId]?.isMoving || false;
      }
  
      /** ✅ Sets bot's target player */
      setTargetPlayer(sessionId: string, targetPlayer: string | null) {
          if (!this.botState[sessionId]) this.botState[sessionId] = this.createDefaultBotState();
          this.botState[sessionId].targetPlayer = targetPlayer;
      }
  
      /** ✅ Retrieves bot's target player */
      getTargetPlayer(sessionId: string): string | null {
          return this.botState[sessionId]?.targetPlayer || null;
      }
  
      /** ✅ Sets bot's last target position */
      setLastTarget(sessionId: string, x: number, y: number) {
          if (!this.botState[sessionId]) this.botState[sessionId] = this.createDefaultBotState();
          this.botState[sessionId].lastTargetX = x;
          this.botState[sessionId].lastTargetY = y;
      }
  
      /** ✅ Retrieves bot's last target X */
      getLastTargetX(sessionId: string): number {
          return this.botState[sessionId]?.lastTargetX || 0;
      }
  
      /** ✅ Retrieves bot's last target Y */
      getLastTargetY(sessionId: string): number {
          return this.botState[sessionId]?.lastTargetY || 0;
      }
  
      /** ✅ Removes stale paths (optional) */
      cleanupOldPaths(expirationTime: number = 10000) {
          const now = Date.now();
          Object.keys(this.botState).forEach(sessionId => {
              if (now - this.botState[sessionId].lastUpdate > expirationTime) {
                  delete this.botState[sessionId];
              }
          });
      }
  
      /** ✅ Creates default bot state (for safety) */
      private createDefaultBotState(): {
          path: { x: number; y: number }[],
          state: BotState,
          targetPlayer: string | null,
          isMoving: boolean,
          lastTargetX: number,
          lastTargetY: number,
          lastUpdate: number
      } {
          return {
              path: [],
              state: BotState.Wandering,
              targetPlayer: null,
              isMoving: false,
              lastTargetX: 0,
              lastTargetY: 0,
              lastUpdate: Date.now()
          };
      }
  }
  