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
