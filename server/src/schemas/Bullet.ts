import { Schema, type } from "@colyseus/schema";

export class Bullet extends Schema {
    @type("number") x: number;
    @type("number") y: number;
    @type("number") dx: number;
    @type("number") dy: number;
    @type("number") lifetime = 2000; // Bullet lifetime in ms
    @type("number") damage = 20; // Bullet lifetime in ms
    @type("string") ownerId: string;
    @type("string") colissionType = "defult";
  }