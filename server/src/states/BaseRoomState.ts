import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player } from "../schemas/Player";
import { Bullet } from "../schemas/Bullet";
import { Pickup } from "../schemas/Pickup";
import { ChatMessage } from "../schemas/ChatMessage";

export class BaseRoomState extends Schema {
  @type("number") mapWidth = 2240;
  @type("number") mapHeight = 1600;

  @type("boolean") showRespawnScreenOnDeath = true;
  @type("boolean") canRespawnOnDeath = true;

  @type("boolean") teamScoring = false;


  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Bullet]) bullets = new ArraySchema<Bullet>();
  @type([Pickup]) pickups = new ArraySchema<Pickup>();
  @type([ChatMessage]) chat = new ArraySchema<ChatMessage>();
}
