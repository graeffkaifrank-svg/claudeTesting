import { Circle, Group, Line, Text } from 'react-konva';

function centroid(points) {
  const n = points.length;
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / n, y: sum.y / n };
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
}

// A freeform, editable polygon (unlike furniture: no fixed width/depth/
// rotation — every corner can be dragged independently once selected).
export default function FreeformShape({ shape, isSelected, draggable, onSelect, onDragEnd, onPointDragEnd, snap }) {
  const flatPoints = shape.points.flatMap((p) => [p.x, p.y]);
  const c = centroid(shape.points);

  return (
    <Group>
      <Group opacity={shape.opacity ?? 1}>
        <Line
          x={0}
          y={0}
          points={flatPoints}
          closed
          fill={hexToRgba(shape.color, 0.45)}
          stroke={isSelected ? '#e94560' : shape.color}
          strokeWidth={isSelected ? 2.5 : 1.5}
          draggable={draggable}
          onClick={(e) => {
            e.cancelBubble = true;
            onSelect(shape.id);
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onSelect(shape.id);
          }}
          onDragEnd={(e) => {
            const node = e.target;
            const dx = node.x();
            const dy = node.y();
            node.position({ x: 0, y: 0 });
            onDragEnd(shape.id, {
              points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            });
          }}
        />
        <Text
          text={shape.label}
          x={c.x}
          y={c.y}
          offsetX={40}
          offsetY={8}
          width={80}
          align="center"
          fontSize={shape.fontSize ?? 13}
          fontStyle="bold"
          fill="#333"
          listening={false}
        />
      </Group>
      {isSelected &&
        shape.points.map((p, i) => (
          <Circle
            key={i}
            x={p.x}
            y={p.y}
            radius={7}
            fill="#e94560"
            stroke="#fff"
            strokeWidth={1.5}
            draggable
            onDragMove={(e) => {
              if (!snap) return;
              const node = e.target;
              node.position({ x: snap(node.x()), y: snap(node.y()) });
            }}
            onDragEnd={(e) => {
              const newPoints = shape.points.map((pt, idx) =>
                idx === i ? { x: e.target.x(), y: e.target.y() } : pt
              );
              onPointDragEnd(shape.id, { points: newPoints });
            }}
          />
        ))}
    </Group>
  );
}
