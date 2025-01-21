import { Schema, type } from "@colyseus/schema";

export class ChatMessage extends Schema {
  @type("string") playerName: string;
  @type("string") message: string;
  @type("number") timestamp: number;
}
