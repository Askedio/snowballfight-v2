import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player } from "../schemas/Player";
import { Bullet } from "../schemas/Bullet";
import { Pickup } from "../Pickup";
import { ChatMessage } from "../schemas/ChatMessage";

export class MyRoomState extends Schema {
  @type("number") mapWidth = 2240;
  @type("number") mapHeight = 1600;

  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Bullet]) bullets = new ArraySchema<Bullet>();
  @type([Pickup]) pickups = new ArraySchema<Pickup>();
  @type([ChatMessage]) chat = new ArraySchema<ChatMessage>();
}
