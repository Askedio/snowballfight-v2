type Point = { x: number; y: number };
type Shape =
  | { type: "circle"; x: number; y: number; radius: number }
  | { type: "box"; x: number; y: number; width: number; height: number; rotation?: number }
  | { type: "polygon"; vertices: Point[] };

export class Collision {
  /**
   * Detects collision between two shapes.
   * @param shapeA The first shape
   * @param shapeB The second shape
   * @returns True if collision is detected, false otherwise.
   */
  detectCollision(shapeA: any, shapeB: any): boolean {
    if (shapeA.type === "circle" && shapeB.type === "circle") {
      return this.detectCircleVsCircle(shapeA, shapeB);
    }

    if (shapeA.type === "circle" && shapeB.type === "box") {
      return this.detectCircleVsRotatedBox(shapeA, shapeB);
    }

    if (shapeA.type === "box" && shapeB.type === "circle") {
      return this.detectCircleVsRotatedBox(shapeB, shapeA);
    }

    if (shapeA.type === "box" && shapeB.type === "box") {
      return this.detectRotatedBoxVsRotatedBox(shapeA, shapeB);
    }

    throw new Error(
      `Collision detection not supported for '${shapeA.type}' and '${shapeB.type}'.`
    );
  }

  /**
   * Detects collision between two circles.
   */
  private detectCircleVsCircle(a: Shape & { type: "circle" }, b: Shape & { type: "circle" }): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= a.radius + b.radius;
  }

  /**
   * Detects collision between a circle and a rotated box.
   */
  private detectCircleVsRotatedBox(circle: Shape & { type: "circle" }, box: Shape & { type: "box" }): boolean {
    const boxVertices = this.getRotatedBoxVertices(box);

    // Project circle and box onto axes of the box
    for (let i = 0; i < boxVertices.length; i++) {
      const next = (i + 1) % boxVertices.length;
      const edge = {
        x: boxVertices[next].x - boxVertices[i].x,
        y: boxVertices[next].y - boxVertices[i].y,
      };
      const axis = { x: -edge.y, y: edge.x }; // Perpendicular axis

      const projectionCircle = this.projectCircle(circle, axis);
      const projectionBox = this.projectPolygon(boxVertices, axis);

      if (projectionCircle.max < projectionBox.min || projectionBox.max < projectionCircle.min) {
        return false; // Separating axis found, no collision
      }
    }

    return true; // No separating axis found, collision detected
  }

  /**
   * Detects collision between two rotated boxes using SAT.
   */
  private detectRotatedBoxVsRotatedBox(a: Shape & { type: "box" }, b: Shape & { type: "box" }): boolean {
    const verticesA = this.getRotatedBoxVertices(a);
    const verticesB = this.getRotatedBoxVertices(b);

    const axes = this.getAxesFromVertices(verticesA).concat(this.getAxesFromVertices(verticesB));

    for (const axis of axes) {
      const projectionA = this.projectPolygon(verticesA, axis);
      const projectionB = this.projectPolygon(verticesB, axis);

      if (projectionA.max < projectionB.min || projectionB.max < projectionA.min) {
        return false; // Separating axis found, no collision
      }
    }

    return true; // No separating axis found, collision detected
  }

  /**
   * Calculates the vertices of a rotated box.
   */
  private getRotatedBoxVertices(box: Shape & { type: "box" }): Point[] {
    const hw = box.width / 2;
    const hh = box.height / 2;
    const cos = Math.cos(box.rotation || 0);
    const sin = Math.sin(box.rotation || 0);

    return [
      { x: box.x + cos * -hw - sin * -hh, y: box.y + sin * -hw + cos * -hh },
      { x: box.x + cos * hw - sin * -hh, y: box.y + sin * hw + cos * -hh },
      { x: box.x + cos * hw - sin * hh, y: box.y + sin * hw + cos * hh },
      { x: box.x + cos * -hw - sin * hh, y: box.y + sin * -hw + cos * hh },
    ];
  }

  /**
   * Projects a polygon onto an axis.
   */
  private projectPolygon(vertices: Point[], axis: Point) {
    const dots = vertices.map((vertex) => vertex.x * axis.x + vertex.y * axis.y);
    return { min: Math.min(...dots), max: Math.max(...dots) };
  }

  /**
   * Projects a circle onto an axis.
   */
  private projectCircle(circle: Shape & { type: "circle" }, axis: Point) {
    const centerProjection = circle.x * axis.x + circle.y * axis.y;
    return { min: centerProjection - circle.radius, max: centerProjection + circle.radius };
  }

  /**
   * Gets the axes from the edges of a polygon.
   */
  private getAxesFromVertices(vertices: Point[]): Point[] {
    const axes: Point[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const next = (i + 1) % vertices.length;
      const edge = {
        x: vertices[next].x - vertices[i].x,
        y: vertices[next].y - vertices[i].y,
      };
      axes.push({ x: -edge.y, y: edge.x }); // Perpendicular axis
    }
    return axes;
  }
}
