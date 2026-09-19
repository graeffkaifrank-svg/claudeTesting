import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line, Transformer } from 'react-konva';
import { useDesignStore, GRID_SIZE } from '../store/useDesignStore';
import { snapAngle, snapValue } from '../utils/geometry';
import { FURNITURE_BY_TYPE, SHAPE_PRESETS, rectPoints } from '../data/furnitureCatalog';
import WallShape from './WallShape';
import FurnitureShape from './FurnitureShape';
import FreeformShape from './FreeformShape';

const SHAPE_PRESET_BY_TYPE = Object.fromEntries(SHAPE_PRESETS.map((p) => [p.type, p]));

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
  const [freeformPoints, setFreeformPoints] = useState([]);

  const walls = useDesignStore((s) => s.walls);
  const furniture = useDesignStore((s) => s.furniture);
  const shapes = useDesignStore((s) => s.shapes);
  const layers = useDesignStore((s) => s.layers);
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
  const addShape = useDesignStore((s) => s.addShape);
  const updateShape = useDesignStore((s) => s.updateShape);
  const removeSelected = useDesignStore((s) => s.removeSelected);
  const copySelected = useDesignStore((s) => s.copySelected);
  const pasteClipboard = useDesignStore((s) => s.pasteClipboard);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);

  const visibleLayerIds = useMemo(
    () => new Set(layers.filter((l) => l.visible).map((l) => l.id)),
    [layers]
  );
  const isVisible = useCallback(
    (item) => !item.layerId || visibleLayerIds.has(item.layerId),
    [visibleLayerIds]
  );
  const visibleWalls = useMemo(() => walls.filter(isVisible), [walls, isVisible]);
  const visibleFurniture = useMemo(() => furniture.filter(isVisible), [furniture, isVisible]);
  const visibleShapes = useMemo(() => shapes.filter(isVisible), [shapes, isVisible]);

  // Deselect if the selected item's layer just got hidden — editing
  // something you can no longer see is confusing.
  useEffect(() => {
    if (!selectedId || !selectedKind) return;
    const list = selectedKind === 'wall' ? walls : selectedKind === 'furniture' ? furniture : shapes;
    const item = list.find((i) => i.id === selectedId);
    if (item && !isVisible(item)) clearSelection();
  }, [selectedId, selectedKind, walls, furniture, shapes, isVisible, clearSelection]);

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

  const endFreeformDraft = useCallback(() => {
    setFreeformPoints([]);
    setPreviewPoint(null);
  }, []);

  const finishFreeform = useCallback(() => {
    if (freeformPoints.length >= 3) {
      const id = addShape({ points: freeformPoints });
      select(id, 'shape');
    }
    endFreeformDraft();
  }, [freeformPoints, addShape, select, endFreeformDraft]);

  useEffect(() => {
    endWallDraft();
    endFreeformDraft();
  }, [tool, endWallDraft, endFreeformDraft]);

  const computeSnappedPoint = useCallback(
    (stage) => {
      const raw = getWorldPoint(stage);
      let point = snapToGrid ? { x: snapValue(raw.x, GRID_SIZE), y: snapValue(raw.y, GRID_SIZE) } : raw;
      const chainStart = tool === 'freeform' ? freeformPoints[freeformPoints.length - 1] : wallStart;
      if (chainStart) point = snapAngle(chainStart, point, 15);
      return point;
    },
    [getWorldPoint, snapToGrid, wallStart, tool, freeformPoints]
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

      if (tool === 'freeform') {
        const point = computeSnappedPoint(stage);
        setFreeformPoints((pts) => [...pts, point]);
        return;
      }

      if (clickedOnEmpty) clearSelection();
    },
    [tool, wallStart, wallThickness, computeSnappedPoint, addWall, clearSelection]
  );

  const handleStageMouseMove = useCallback(() => {
    const active = (tool === 'wall' && wallStart) || (tool === 'freeform' && freeformPoints.length > 0);
    if (!active) return;
    const stage = stageRef.current;
    if (!stage) return;
    setPreviewPoint(computeSnappedPoint(stage));
  }, [tool, wallStart, freeformPoints, computeSnappedPoint]);

  // Right-click (or Escape) finishes the current wall/freeform chain. We
  // deliberately don't use Konva's dblclick here: it fires purely on
  // click-timing without checking position, so two quick single clicks while
  // chaining points (a very normal thing to do) would be misread as a
  // double-click and cut the chain short.
  const handleStageContextMenu = useCallback(
    (e) => {
      e.evt.preventDefault();
      if (tool === 'wall') endWallDraft();
      if (tool === 'freeform') finishFreeform();
    },
    [tool, endWallDraft, finishFreeform]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        endWallDraft();
        endFreeformDraft();
      }
      if (e.key === 'Enter' && tool === 'freeform') finishFreeform();
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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteClipboard();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, removeSelected, undo, redo, endWallDraft, endFreeformDraft, finishFreeform, tool, copySelected, pasteClipboard]);

  const handleDragOver = useCallback((e) => e.preventDefault(), []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      stage.setPointersPositions(e);
      const raw = getWorldPoint(stage);
      const point = snapToGrid ? { x: snapValue(raw.x, GRID_SIZE), y: snapValue(raw.y, GRID_SIZE) } : raw;

      const shapeType = e.dataTransfer.getData('application/shape-type');
      const shapeDef = SHAPE_PRESET_BY_TYPE[shapeType];
      if (shapeDef) {
        const id = addShape({
          ...shapeDef,
          points: rectPoints(point.x, point.y, shapeDef.width, shapeDef.depth),
        });
        select(id, 'shape');
        return;
      }

      const type = e.dataTransfer.getData('application/furniture-type');
      const def = FURNITURE_BY_TYPE[type];
      if (!def) return;

      const id = addFurniture({
        ...def,
        x: point.x,
        y: point.y,
        rotation: 0,
      });
      select(id, 'furniture');
    },
    [getWorldPoint, snapToGrid, addFurniture, addShape, select]
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

  const freeformPreviewPoints = useMemo(() => {
    if (freeformPoints.length === 0) return null;
    const pts = freeformPoints.flatMap((p) => [p.x, p.y]);
    if (previewPoint) pts.push(previewPoint.x, previewPoint.y);
    return pts;
  }, [freeformPoints, previewPoint]);

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
          {visibleShapes.map((shape) => (
            <FreeformShape
              key={shape.id}
              shape={shape}
              isSelected={selectedId === shape.id && selectedKind === 'shape'}
              draggable={tool === 'select'}
              onSelect={(id) => select(id, 'shape')}
              onDragEnd={(id, patch) => updateShape(id, patch)}
              onPointDragEnd={(id, patch) => updateShape(id, patch)}
              snap={snapFn}
            />
          ))}
          {freeformPreviewPoints && freeformPreviewPoints.length >= 2 && (
            <Line
              points={freeformPreviewPoints}
              closed={freeformPoints.length >= 2}
              stroke="#e94560"
              fill="rgba(233,69,96,0.12)"
              strokeWidth={2}
              dash={[10, 6]}
              opacity={0.8}
            />
          )}
        </Layer>

        <Layer>
          {visibleWalls.map((w) => (
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
          {visibleFurniture.map((item) => (
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
              // Only enforce the minimum size while actually resizing. A pure
              // rotation reports the same width/height as before, just a new
              // angle — applying the floor there used to make thin items
              // (fences, doors, hedges, ...) impossible to rotate as soon as
              // their on-screen size dropped under the threshold.
              const isResize = newBox.width !== oldBox.width || newBox.height !== oldBox.height;
              if (isResize && (newBox.width < 15 || newBox.height < 15)) return oldBox;
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
        {tool === 'freeform' &&
          (freeformPoints.length > 0
            ? 'Klicken für weitere Ecken · Rechtsklick/Enter zum Schließen · Esc zum Abbrechen'
            : 'Klicken zum Start einer Freiformfläche')}
        {tool === 'select' && 'Ziehen zum Verschieben · Entf zum Löschen · Strg+C/V zum Kopieren · Mausrad zum Zoomen'}
      </div>
    </div>
  );
}
