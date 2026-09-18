import { Circle, Group, Line, Text } from 'react-konva';
import { formatLength } from '../utils/geometry';

export default function WallShape({ wall, isSelected, draggable, onSelect, onDragEnd, onEndpointDragEnd, snap }) {
  const { x1, y1, x2, y2, thickness } = wall;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

  return (
    <Group>
      <Line
        x={0}
        y={0}
        points={[x1, y1, x2, y2]}
        stroke={isSelected ? '#e94560' : '#3a3a4e'}
        strokeWidth={thickness}
        lineCap="square"
        draggable={draggable}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(wall.id);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(wall.id);
        }}
        onDragEnd={(e) => {
          const node = e.target;
          const dx = node.x();
          const dy = node.y();
          node.position({ x: 0, y: 0 });
          onDragEnd(wall.id, {
            x1: x1 + dx,
            y1: y1 + dy,
            x2: x2 + dx,
            y2: y2 + dy,
          });
        }}
      />
      {length > 60 && (
        <Text
          text={formatLength(length)}
          x={midX}
          y={midY}
          rotation={angle}
          offsetX={20}
          offsetY={thickness / 2 + 14}
          fontSize={12}
          fill="#555"
          listening={false}
        />
      )}
      {isSelected && (
        <>
          <Circle
            x={x1}
            y={y1}
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
              onEndpointDragEnd(wall.id, { x1: e.target.x(), y1: e.target.y() });
            }}
          />
          <Circle
            x={x2}
            y={y2}
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
              onEndpointDragEnd(wall.id, { x2: e.target.x(), y2: e.target.y() });
            }}
          />
        </>
      )}
    </Group>
  );
}
