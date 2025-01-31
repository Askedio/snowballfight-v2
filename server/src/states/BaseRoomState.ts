import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player } from "../schemas/Player";
import { Bullet } from "../schemas/Bullet";
import { Pickup } from "../schemas/Pickup";
import { ChatMessage } from "../schemas/ChatMessage";

class PolygonPoint extends Schema {
  @type("number") x: number;
  @type("number") y: number;

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }
}

class Polygon extends Schema {
  @type([PolygonPoint]) points: ArraySchema<PolygonPoint> =
    new ArraySchema<PolygonPoint>();

  constructor(points: { x: number; y: number }[]) {
    super();

    // ✅ Ensure `points` is correctly instantiated as an `ArraySchema`
    this.points = new ArraySchema(
      ...points.map((p) => new PolygonPoint(p.x, p.y))
    );
  }
}

export class BaseRoomState extends Schema {
  @type("number") mapWidth = 2240;
  @type("number") mapHeight = 1600;
  @type("boolean") requiresReady = false;

  @type("boolean") showRespawnScreenOnDeath = true;
  @type("boolean") canRespawnOnDeath = true;

  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Bullet]) bullets = new ArraySchema<Bullet>();
  @type([Pickup]) pickups = new ArraySchema<Pickup>();
  @type([ChatMessage]) chat = new ArraySchema<ChatMessage>();

  @type("number") timeLimit = 1000 * 60 * 5; //1000 * 60 * 5; // 5m
  @type("number") roundStartsIn = 1000 * 5; // 5 seconds

  @type("string") roundStartsAt: string;
  @type("string") roundEndsAt: string;
  @type("boolean") roundActive = false;
  @type("boolean") waitingForPlayers = false;
  @type("boolean") waitingToStart = false;

  @type("boolean") teamScoring = false;
  @type("number") redScore = 0;
  @type("number") blueScore = 0;
  @type("string") playerScoreType = "kills";

  @type([Polygon]) navMesh = new ArraySchema<Polygon>(); // NavMesh polygons

  constructor() {
    super();
    this.navMesh = new ArraySchema<Polygon>();
  }

  setRoundStartsAt() {
    const now = Date.now(); // Current timestamp in milliseconds
    const roundStartTime = new Date(now + this.roundStartsIn); // Add timeLimit to the current time
    this.roundStartsAt = roundStartTime.toISOString(); // Convert to ISO 8601 string
  }

  setRoundEndsAt(limit: number = undefined) {
    const now = Date.now(); // Current timestamp in milliseconds
    const roundEndTime = new Date(now + (limit || this.timeLimit)); // Add timeLimit to the current time
    this.roundEndsAt = roundEndTime.toISOString(); // Convert to ISO 8601 string
  }

  updateNavMesh(polyGrid: { x: number; y: number }[][]) {
    this.navMesh.clear();

    polyGrid.forEach((polygon) => {
      if (polygon.length > 0) {
        this.navMesh.push(new Polygon(polygon)); // ✅ Ensure each polygon is an instance of `Polygon`
      }
    });
  }
}
