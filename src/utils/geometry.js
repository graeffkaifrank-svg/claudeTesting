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

// Closest point on segment a->b to point p, plus the distance to it.
export function pointToSegmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { distance: Math.hypot(p.x - point.x, p.y - point.y), point };
}

// World-space outline corners for one design element, used to measure the
// gap between any two elements (not just walls) the same way.
export function wallFootprint(wall) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (wall.thickness / 2);
  const ny = (dx / len) * (wall.thickness / 2);
  return [
    { x: wall.x1 + nx, y: wall.y1 + ny },
    { x: wall.x2 + nx, y: wall.y2 + ny },
    { x: wall.x2 - nx, y: wall.y2 - ny },
    { x: wall.x1 - nx, y: wall.y1 - ny },
  ];
}

export function furnitureFootprint(item) {
  const hw = item.width / 2;
  const hd = item.depth / 2;
  const rad = ((item.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ].map((c) => ({ x: item.x + c.x * cos - c.y * sin, y: item.y + c.x * sin + c.y * cos }));
}

export function elementFootprint(el, kind) {
  if (kind === 'wall') return wallFootprint(el);
  if (kind === 'furniture') return furnitureFootprint(el);
  if (kind === 'shape') return el.points.map((p) => ({ x: p.x, y: p.y }));
  return [];
}

// Shortest distance between two (non-overlapping, simple) polygons: the
// minimum always occurs between a vertex of one and an edge of the other.
function footprintsMinDistance(polyA, polyB) {
  let best = null;
  const consider = (p, poly, swap) => {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const { distance: d, point } = pointToSegmentDistance(p, a, b);
      if (!best || d < best.distance) best = swap ? { distance: d, pointA: point, pointB: p } : { distance: d, pointA: p, pointB: point };
    }
  };
  for (const p of polyA) consider(p, polyB, false);
  for (const p of polyB) consider(p, polyA, true);
  return best ?? { distance: 0, pointA: polyA[0], pointB: polyB[0] };
}

// Distance + direction between any two elements (wall, furniture or freeform
// shape), each identified by its `kind`. Returns the closest points on each
// element's outline and the unit vector from A to B — translating element B
// by that vector times a delta changes the gap by exactly that delta, which
// is what the "set distance" editor uses to pull/push it to a typed value.
export function elementDistance(elA, kindA, elB, kindB) {
  const polyA = elementFootprint(elA, kindA);
  const polyB = elementFootprint(elB, kindB);
  const { distance: dist, pointA, pointB } = footprintsMinDistance(polyA, polyB);
  const dirX = dist === 0 ? 0 : (pointB.x - pointA.x) / dist;
  const dirY = dist === 0 ? 0 : (pointB.y - pointA.y) / dist;
  return { distance: dist, dirX, dirY, pointA, pointB };
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
