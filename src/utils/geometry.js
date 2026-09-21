export function snapValue(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPoint(point, gridSize) {
  return { x: snapValue(point.x, gridSize), y: snapValue(point.y, gridSize) };
}

export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Snaps the angle between start->end to the nearest `stepDeg` degrees,
// keeping the same distance from start. Makes it easy to draw straight
// horizontal/vertical/diagonal walls.
export function snapAngle(start, end, stepDeg = 15) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { ...end };
  const angle = Math.atan2(dy, dx);
  const stepRad = (stepDeg * Math.PI) / 180;
  const snappedAngle = Math.round(angle / stepRad) * stepRad;
  return {
    x: Math.round((start.x + Math.cos(snappedAngle) * dist) * 100) / 100,
    y: Math.round((start.y + Math.sin(snappedAngle) * dist) * 100) / 100,
  };
}

export function cmToMeters(cm) {
  return cm / 100;
}

export function formatLength(cm) {
  return `${cmToMeters(cm).toFixed(2)} m`;
}

export function formatArea(cm2) {
  return `${(cm2 / 10000).toFixed(2)} m²`;
}

// Perpendicular gap between two (roughly parallel) walls: projects wallA's
// midpoint onto wallB's infinite line. Returns the foot point on wallB, the
// distance to it, and the unit direction from wallA towards that foot point
// — translating wallB's endpoints by that direction times a delta changes
// the gap by exactly that delta, which is what the "set distance" editor
// uses to pull/push wallB to a typed-in value.
export function wallToWallDistance(wallA, wallB) {
  const midA = { x: (wallA.x1 + wallA.x2) / 2, y: (wallA.y1 + wallA.y2) / 2 };
  const dx = wallB.x2 - wallB.x1;
  const dy = wallB.y2 - wallB.y1;
  const lenB = Math.hypot(dx, dy);
  if (lenB === 0) return { distance: 0, dirX: 0, dirY: 0, foot: midA };
  const ux = dx / lenB;
  const uy = dy / lenB;
  const t = (midA.x - wallB.x1) * ux + (midA.y - wallB.y1) * uy;
  const foot = { x: wallB.x1 + ux * t, y: wallB.y1 + uy * t };
  const dist = Math.hypot(foot.x - midA.x, foot.y - midA.y);
  const dirX = dist === 0 ? 0 : (foot.x - midA.x) / dist;
  const dirY = dist === 0 ? 0 : (foot.y - midA.y) / dist;
  return { distance: dist, dirX, dirY, foot };
}

// Shoelace formula for a simple polygon's area (points in cm), returns cm².
export function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(area / 2);
}
