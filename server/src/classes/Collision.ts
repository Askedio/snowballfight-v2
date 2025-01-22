import * as Matter from "matter-js";

// Define options for each shape (Circle, Rectangle, Triangle)
interface ShapeOptions extends Matter.IBodyDefinition {
  radius?: number;
  width?: number;
  height?: number;
  offset?: number;
}

class Collision {
  private world: Matter.World;
  private engine: Matter.Engine;
  private body: Matter.Body;
  private x: number;
  private y: number;
  private options: ShapeOptions;

  constructor(type: string, x: number, y: number, options: ShapeOptions = {}) {
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    this.x = x;
    this.y = y;
    this.options = options;

    // Create the shape and add it to the world
    this.body = this.createShape(type);
    Matter.World.add(this.world, this.body);

    // Run the engine continuously
    Matter.Engine.run(this.engine);
  }

  private createShape(type: string): Matter.Body {
    switch (type) {
      case "circle":
        return Matter.Bodies.circle(
          this.x,
          this.y,
          this.options.radius || 20,
          this.options
        );
      case "rectangle":
        return Matter.Bodies.rectangle(
          this.x,
          this.y,
          this.options.width || 50,
          this.options.height || 30,
          this.options
        );
      case "triangle":
        return this.createTriangle();
      default:
        throw new Error("Shape type not supported");
    }
  }

  private createTriangle(): Matter.Body {
    const radius = this.options.radius || 20;
    const offset = this.options.offset || 10;
    const vertices = [
      { x: this.x, y: this.y - offset }, // Top
      { x: this.x - radius, y: this.y + radius }, // Bottom-left
      { x: this.x + radius, y: this.y + radius }, // Bottom-right
    ];
    return Matter.Bodies.fromVertices(this.x, this.y, [vertices], this.options);
  }

  // Check if the pickup collides with the player
  public collides(player: Matter.Body): boolean {
    const collision = Matter.Collision.collides(this.body, player);
    return collision.collided;
  }

  // Destroy the shape (clean up)
  public destroy(): void {
    Matter.World.remove(this.world, this.body);
  }
}
