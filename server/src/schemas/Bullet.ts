import { Schema, type } from "@colyseus/schema";

export class Bullet extends Schema {
  @type("string") id: string;
  @type("string") ownerId: string;
  @type("string") colissionType = "defult";

  // Display
  @type("string") skin = "snowball";

  // Position
  @type("number") x: number;
  @type("number") y: number;
  @type("number") dx: number;
  @type("number") dy: number;

  // Stats
  @type("number") lifetime = 700; // Bullet lifetime in ms
  @type("number") damage = 20; // Bullet lifetime in ms
  @type("number") size = 5; // Bullet lifetime in ms

  // Animations
  @type("string") impactAnimation = "explosiongrey"; // Default animation
  @type("string") impactOnPlayerAnimation = "explosiongrey";
  @type("string") impactOnPickupAnimation = "explosiongrey";
  @type("string") impactOnColissionAnimation = "explosiongrey";
  @type("string") impactOnTimeoutAnimation = "explosiongrey";
  @type("string") impactOnOutofboundsAnimation = "";

  // Sounds
  @type("string") impactSound = "bullet1"; // Default sound
  @type("string") impactOnPlayerSound = "bullet1";
  @type("string") impactOnPickupSound = "bullet1";
  @type("string") impactOncollisionsound = "bullet1";
  @type("string") impactOnTimeoutSound = "bullet1";
  @type("string") impactOnOutofboundsSound = "bullet1";
}
