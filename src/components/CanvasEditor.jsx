import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line, Transformer } from 'react-konva';
import { useDesignStore, GRID_SIZE } from '../store/useDesignStore';
import { snapAngle, snapValue } from '../utils/geometry';
import { FURNITURE_BY_TYPE } from '../data/furnitureCatalog';
import WallShape from './WallShape';
import FurnitureShape from './FurnitureShape';

const MIN_SCALE = 0.03; // zoomed out enough to fit a large plot/garden
const MAX_SCALE = 6;
const BASE_SCALE = 1.2; // px per cm at zoom = 1

// Grid step (and the coarser "major" line every few steps) adapts to zoom,
// so a small room and a whole property both get a readable grid instead of
// either a solid smear of lines or one that's clipped by the render cap.
const GRID_STEPS_CM = [
  { step: 10, major: 50 },
  { step: 20, major: 100 },
  { step: 50, major: 100 },
  { step: 100, major: 500 },
  { step: 200, major: 1000 },
  { step: 500, major: 1000 },
  { step: 1000, major: 5000 },
  { step: 2000, major: 10000 },
  { step: 5000, major: 10000 },
];
const MIN_LINE_SPACING_PX = 45;

function pickGridStep(stageScale) {
  const found = GRID_STEPS_CM.find(({ step }) => step * stageScale >= MIN_LINE_SPACING_PX);
  return found ?? GRID_STEPS_CM[GRID_STEPS_CM.length - 1];
}

function GridLines({ width, height, stageScale, stagePos }) {
  const { step, major: majorEvery } = pickGridStep(stageScale);

  const minX = -stagePos.x / stageScale;
  const minY = -stagePos.y / stageScale;
  const maxX = (width - stagePos.x) / stageScale;
  const maxY = (height - stagePos.y) / stageScale;

  const lines = [];
  const startX = Math.floor(minX / step) * step;
  const startY = Math.floor(minY / step) * step;

  let count = 0;
  for (let x = startX; x <= maxX && count < 600; x += step, count++) {
    const isMajor = Math.round(x) % majorEvery === 0;
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, minY, x, maxY]}
        stroke={isMajor ? '#d7dbe3' : '#eceff3'}
        strokeWidth={(isMajor ? 1 : 0.6) / stageScale}
      />
    );
  }
  for (let y = startY; y <= maxY && count < 1200; y += step, count++) {
    const isMajor = Math.round(y) % majorEvery === 0;
    lines.push(
      <Line
        key={`h${y}`}
        points={[minX, y, maxX, y]}
        stroke={isMajor ? '#d7dbe3' : '#eceff3'}
        strokeWidth={(isMajor ? 1 : 0.6) / stageScale}
      />
    );
  }

  return lines;
}

export default function CanvasEditor() {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const shapeRefs = useRef({});

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [stageScale, setStageScale] = useState(BASE_SCALE);
  const [stagePos, setStagePos] = useState({ x: 60, y: 60 });
  const [wallStart, setWallStart] = useState(null);
  const [previewPoint, setPreviewPoint] = useState(null);

  const walls = useDesignStore((s) => s.walls);
  const furniture = useDesignStore((s) => s.furniture);
  const tool = useDesignStore((s) => s.tool);
  const snapToGrid = useDesignStore((s) => s.snapToGrid);
  const wallThickness = useDesignStore((s) => s.wallThickness);
  const selectedId = useDesignStore((s) => s.selectedId);
  const selectedKind = useDesignStore((s) => s.selectedKind);
  const select = useDesignStore((s) => s.select);
  const clearSelection = useDesignStore((s) => s.clearSelection);
  const addWall = useDesignStore((s) => s.addWall);
  const updateWall = useDesignStore((s) => s.updateWall);
  const addFurniture = useDesignStore((s) => s.addFurniture);
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const removeSelected = useDesignStore((s) => s.removeSelected);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const snapFn = useCallback((v) => (snapToGrid ? snapValue(v, GRID_SIZE) : v), [snapToGrid]);

  const getWorldPoint = useCallback((stage) => stage.getRelativePointerPosition() ?? { x: 0, y: 0 }, []);

  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      const oldScale = stageScale;
      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldScale,
        y: (pointer.y - stagePos.y) / oldScale,
      };
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const scaleBy = 1.08;
      let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));

      setStageScale(newScale);
      setStagePos({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
    },
    [stageScale, stagePos]
  );

  const endWallDraft = useCallback(() => {
    setWallStart(null);
    setPreviewPoint(null);
  }, []);

  useEffect(() => {
    endWallDraft();
  }, [tool, endWallDraft]);

  const computeSnappedPoint = useCallback(
    (stage) => {
      const raw = getWorldPoint(stage);
      let point = snapToGrid ? { x: snapValue(raw.x, GRID_SIZE), y: snapValue(raw.y, GRID_SIZE) } : raw;
      if (wallStart) point = snapAngle(wallStart, point, 15);
      return point;
    },
    [getWorldPoint, snapToGrid, wallStart]
  );

  const handleStageMouseDown = useCallback(
    (e) => {
      const stage = stageRef.current;
      if (!stage) return;
      const clickedOnEmpty = e.target === stage;

      if (tool === 'wall') {
        const point = computeSnappedPoint(stage);
        if (!wallStart) {
          setWallStart(point);
        } else {
          if (point.x !== wallStart.x || point.y !== wallStart.y) {
            addWall({ x1: wallStart.x, y1: wallStart.y, x2: point.x, y2: point.y, thickness: wallThickness });
          }
          setWallStart(point);
        }
        return;
      }

      if (clickedOnEmpty) clearSelection();
    },
    [tool, wallStart, wallThickness, computeSnappedPoint, addWall, clearSelection]
  );

  const handleStageMouseMove = useCallback(() => {
    if (tool !== 'wall' || !wallStart) return;
    const stage = stageRef.current;
    if (!stage) return;
    setPreviewPoint(computeSnappedPoint(stage));
  }, [tool, wallStart, computeSnappedPoint]);

  // Right-click (or Escape) finishes the current wall chain. We deliberately
  // don't use Konva's dblclick here: it fires purely on click-timing without
  // checking position, so two quick single clicks while chaining walls (a very
  // normal thing to do) would be misread as a double-click and cut the chain short.
  const handleStageContextMenu = useCallback(
    (e) => {
      e.evt.preventDefault();
      if (tool === 'wall') endWallDraft();
    },
    [tool, endWallDraft]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') endWallDraft();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        removeSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, removeSelected, undo, redo, endWallDraft]);

  const handleDragOver = useCallback((e) => e.preventDefault(), []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const type = e.dataTransfer.getData('application/furniture-type');
      const def = FURNITURE_BY_TYPE[type];
      if (!def) return;

      stage.setPointersPositions(e);
      const raw = getWorldPoint(stage);
      const point = snapToGrid ? { x: snapValue(raw.x, GRID_SIZE), y: snapValue(raw.y, GRID_SIZE) } : raw;

      const id = addFurniture({
        ...def,
        x: point.x,
        y: point.y,
        rotation: 0,
      });
      select(id, 'furniture');
    },
    [getWorldPoint, snapToGrid, addFurniture, select]
  );

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (selectedKind === 'furniture' && shapeRefs.current[selectedId]) {
      tr.nodes([shapeRefs.current[selectedId]]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [selectedId, selectedKind, furniture]);

  const previewLinePoints = useMemo(() => {
    if (!wallStart || !previewPoint) return null;
    return [wallStart.x, wallStart.y, previewPoint.x, previewPoint.y];
  }, [wallStart, previewPoint]);

  return (
    <div ref={containerRef} className="canvas-wrap" onDragOver={handleDragOver} onDrop={handleDrop}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={tool === 'select'}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onContextMenu={handleStageContextMenu}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() });
        }}
        style={{ cursor: tool === 'wall' ? 'crosshair' : 'default' }}
      >
        <Layer listening={false}>
          <GridLines width={size.width} height={size.height} stageScale={stageScale} stagePos={stagePos} />
        </Layer>

        <Layer>
          {walls.map((w) => (
            <WallShape
              key={w.id}
              wall={w}
              isSelected={selectedId === w.id && selectedKind === 'wall'}
              draggable={tool === 'select'}
              onSelect={(id) => select(id, 'wall')}
              onDragEnd={(id, patch) => updateWall(id, patch)}
              onEndpointDragEnd={(id, patch) => updateWall(id, patch)}
              snap={snapFn}
            />
          ))}
          {previewLinePoints && (
            <Line points={previewLinePoints} stroke="#e94560" strokeWidth={wallThickness} dash={[10, 6]} opacity={0.7} />
          )}
        </Layer>

        <Layer>
          {furniture.map((item) => (
            <FurnitureShape
              key={item.id}
              item={item}
              isSelected={selectedId === item.id && selectedKind === 'furniture'}
              draggable={tool === 'select'}
              onSelect={(id) => select(id, 'furniture')}
              onDragEnd={(id, patch) => updateFurniture(id, patch)}
              snap={snapFn}
              shapeRef={(node) => {
                if (node) shapeRefs.current[item.id] = node;
                else delete shapeRefs.current[item.id];
              }}
            />
          ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 15 || newBox.height < 15) return oldBox;
              return newBox;
            }}
            onTransformEnd={(e) => {
              const node = e.target;
              const id = Object.keys(shapeRefs.current).find((k) => shapeRefs.current[k] === node);
              if (!id) return;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              const current = furniture.find((f) => f.id === id);
              if (!current) return;
              updateFurniture(id, {
                x: node.x(),
                y: node.y(),
                rotation: node.rotation(),
                width: Math.max(10, Math.round(current.width * scaleX)),
                depth: Math.max(10, Math.round(current.depth * scaleY)),
              });
            }}
          />
        </Layer>
      </Stage>

      <div className="canvas-hint">
        {tool === 'wall' && (wallStart ? 'Klicken zum Setzen des nächsten Punkts · Rechtsklick/Esc zum Beenden' : 'Klicken zum Start einer Wand')}
        {tool === 'select' && 'Ziehen zum Verschieben · Entf zum Löschen · Mausrad zum Zoomen'}
      </div>
    </div>
  );
}
