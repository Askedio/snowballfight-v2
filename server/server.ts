import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const TICK_RATE = 60; // 60 ticks per second
const TICK_DURATION = 1000 / TICK_RATE;
const PLAYER_SPEED = 100; // Speed of players, set server-side

let tick = 0;

interface PlayerState {
  id: string;
  x: number;
  y: number;
  health: number;
  activeInputs: Set<string>; // Track active inputs
}

interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

const players: Record<string, PlayerState> = {};
let bullets: Bullet[] = [];

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  players[socket.id] = { id: socket.id, x: 400, y: 300, health: 100,  activeInputs: new Set<string>(), };

  socket.emit("initialize", { tick, players, bullets });
  socket.broadcast.emit("playerJoined", players[socket.id]);

  socket.on("updatePosition", (data: { x: number; y: number }) => {
    const player = players[socket.id];
    if (player) {
      // Update player position with server-side speed logic
      const dx = data.x - player.x;
      const dy = data.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const moveDistance = Math.min(PLAYER_SPEED * (TICK_DURATION / 1000), distance);

      player.x += (dx / distance) * moveDistance;
      player.y += (dy / distance) * moveDistance;
    }
  });

  socket.on("input", (data: { action: string; isActive: boolean }) => {
    const player = players[socket.id];
    if (player) {
      if (data.isActive) {
        player.activeInputs.add(data.action);
      } else {
        player.activeInputs.delete(data.action);
      }
    }
  });

  socket.on("clearInputs", () => {
    const player = players[socket.id];
    if (player) {
      player.activeInputs.clear(); // Clear all active inputs
    }
  });

  socket.on("shootBullet", (data: { dx: number; dy: number }) => {
    const player = players[socket.id];
    console.log("on shot")
    if (player) {
      const bulletId = `${socket.id}-${Date.now()}`;
      bullets.push({
        id: bulletId,
        ownerId: socket.id,
        x: player.x,
        y: player.y,
        dx: data.dx,
        dy: data.dy,
      });
      console.log(`Bullet created: ${bulletId} from player ${socket.id}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit("playerLeft", socket.id);
  });
});


setInterval(() => {
  tick++;

  Object.values(players).forEach((player) => {
    const moveDistance = PLAYER_SPEED * (TICK_DURATION / 1000);

    if (player.activeInputs.has("left")) player.x -= moveDistance;
    if (player.activeInputs.has("right")) player.x += moveDistance;
    if (player.activeInputs.has("up")) player.y -= moveDistance;
    if (player.activeInputs.has("down")) player.y += moveDistance;
  });

  bullets = bullets.filter((bullet) => {
    // Move the bullet
    const velocityScale = 1; // Scale velocity per tick
    bullet.x += bullet.dx * velocityScale;
    bullet.y += bullet.dy * velocityScale;
  
    // Check for collisions
    for (const playerId in players) {
      const player = players[playerId];
      if (player.id !== bullet.ownerId && player.health > 0) {
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
  
        if (distance < 10) {
          player.health -= 5;
  
          if (player.health <= 0) {
            console.log(`Player ${player.id} died`);
            io.emit("playerDied", player.id);
            delete players[playerId];
          }
  
          return false; // Remove the bullet after collision
        }
      }
    }
  
    // Remove the bullet if it is out of bounds
    return bullet.x >= 0 && bullet.x <= 800 && bullet.y >= 0 && bullet.y <= 600;
  });
  

  io.emit("stateUpdate", { tick, players, bullets });
}, TICK_DURATION);


httpServer.listen(3002, () => {
  console.log("Server listening on http://localhost:3002");
});
