import { Group, Rect, Ellipse, Circle, Text, Line, Arc } from 'react-konva';

// Extra symbol drawn on top of the base rectangle for a few furniture
// types, to make the floor plan read like a real one (door swing, window
// panes, sink basin, ...).
// Note: local coordinate space of a furniture Group's children is
// [0, width] x [0, depth] — the Group's offsetX/offsetY only move the
// rotation/position pivot to the center, it does not re-center children.
function Decoration({ item }) {
  const { type, width: w, depth: d } = item;

  switch (type) {
    case 'door': {
      const radius = w;
      return (
        <>
          <Line points={[0, d, 0, d - radius]} stroke="#6b4a24" strokeWidth={2} />
          <Arc
            x={0}
            y={d}
            innerRadius={0}
            outerRadius={radius}
            angle={90}
            rotation={-90}
            stroke="#6b4a24"
            strokeWidth={1}
            dash={[4, 4]}
            fill="rgba(224,164,88,0.08)"
          />
        </>
      );
    }
    case 'window':
      return <Line points={[0, d / 2, w, d / 2]} stroke="#4a6fa5" strokeWidth={2} />;
    case 'sink':
    case 'washbasin':
      return (
        <Rect
          x={w * 0.2}
          y={d * 0.2}
          width={w * 0.6}
          height={d * 0.6}
          stroke="#6d7680"
          strokeWidth={1}
          cornerRadius={w * 0.15}
        />
      );
    case 'bed-double':
    case 'bed-single':
      return (
        <Rect x={6} y={6} width={w - 12} height={d * 0.28} fill="rgba(255,255,255,0.5)" cornerRadius={4} />
      );
    case 'tree':
      return <Circle x={w / 2} y={d / 2} radius={Math.min(w, d) * 0.12} fill="rgba(90,60,30,0.55)" />;
    default:
      return null;
  }
}

export default function FurnitureShape({ item, isSelected, draggable, onSelect, onDragEnd, shapeRef, snap }) {
  return (
    <Group
      ref={shapeRef}
      x={item.x}
      y={item.y}
      rotation={item.rotation}
      offsetX={item.width / 2}
      offsetY={item.depth / 2}
      opacity={item.opacity ?? 1}
      draggable={draggable}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(item.id);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(item.id);
      }}
      onDragMove={(e) => {
        if (!snap) return;
        // live-snap the group's absolute position while dragging
        const node = e.target;
        node.position({ x: snap(node.x()), y: snap(node.y()) });
      }}
      onDragEnd={(e) => {
        const node = e.target;
        onDragEnd(item.id, { x: node.x(), y: node.y() });
      }}
    >
      {item.shape === 'circle' ? (
        <Ellipse
          x={item.width / 2}
          y={item.depth / 2}
          radiusX={item.width / 2}
          radiusY={item.depth / 2}
          fill={item.color}
          stroke={isSelected ? '#e94560' : '#33333366'}
          strokeWidth={isSelected ? 2.5 : 1}
        />
      ) : item.shape === 'zone' ? (
        <Rect
          x={0}
          y={0}
          width={item.width}
          height={item.depth}
          fill={item.color}
          stroke={isSelected ? '#e94560' : item.color}
          strokeWidth={isSelected ? 2.5 : 1.5}
          dash={[10, 6]}
        />
      ) : (
        <Rect
          x={0}
          y={0}
          width={item.width}
          height={item.depth}
          fill={item.color}
          stroke={isSelected ? '#e94560' : '#33333366'}
          strokeWidth={isSelected ? 2.5 : 1}
          cornerRadius={Math.min(6, item.width * 0.05, item.depth * 0.05)}
          offsetX={0}
          offsetY={0}
        />
      )}
      <Decoration item={item} />
      <Text
        text={item.label}
        width={item.width}
        height={item.depth}
        align="center"
        verticalAlign="middle"
        fontSize={item.fontSize ?? Math.min(item.shape === 'zone' ? 16 : 14, item.width / 6, item.depth / 2)}
        fontStyle={item.shape === 'zone' ? 'bold' : 'normal'}
        fill={item.shape === 'zone' ? '#333' : '#1a1a2e'}
        listening={false}
      />
    </Group>
  );
}
