import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line, Circle, Rect, Text, Transformer } from 'react-konva';
import { useDesignStore, GRID_SIZE } from '../store/useDesignStore';
import {
  snapAngle,
  snapValue,
  elementDistance,
  formatLength,
  nearestWallEndpoint,
  nearestWallLinePoint,
  furnitureFootprint,
} from '../utils/geometry';
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
  const [marquee, setMarquee] = useState(null); // {x1,y1,x2,y2} world coords while shift-dragging on empty canvas

  const walls = useDesignStore((s) => s.walls);
  const furniture = useDesignStore((s) => s.furniture);
  const shapes = useDesignStore((s) => s.shapes);
  const layers = useDesignStore((s) => s.layers);
  const tool = useDesignStore((s) => s.tool);
  const snapToGrid = useDesignStore((s) => s.snapToGrid);
  const wallThickness = useDesignStore((s) => s.wallThickness);
  const selectedId = useDesignStore((s) => s.selectedId);
  const selectedKind = useDesignStore((s) => s.selectedKind);
  const selection = useDesignStore((s) => s.selection);
  const measureIds = useDesignStore((s) => s.measureIds);
  const toggleMeasureElement = useDesignStore((s) => s.toggleMeasureElement);
  const clearMeasureElements = useDesignStore((s) => s.clearMeasureElements);
  const select = useDesignStore((s) => s.select);
  const selectMany = useDesignStore((s) => s.selectMany);
  const translateSelection = useDesignStore((s) => s.translateSelection);
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

  // Drop any selected item whose layer just got hidden — editing something
  // you can no longer see is confusing.
  useEffect(() => {
    if (selection.length === 0) return;
    const stillVisible = selection.filter(({ id, kind }) => {
      const list = kind === 'wall' ? walls : kind === 'furniture' ? furniture : shapes;
      const item = list.find((i) => i.id === id);
      return item && isVisible(item);
    });
    if (stillVisible.length !== selection.length) {
      if (stillVisible.length === 0) clearSelection();
      else selectMany(stillVisible, false);
    }
  }, [selection, walls, furniture, shapes, isVisible, clearSelection, selectMany]);

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

  // Screen-pixel catch radius for corner snapping, converted to world cm so
  // it feels the same size on screen at any zoom level.
  const CORNER_SNAP_PX = 14;

  // Snaps a point onto a nearby wall's endpoint (so two walls connect
  // exactly at a corner instead of by coincidence); falls back to the grid.
  // `excludeWallId` keeps a wall's own endpoint from "snapping" to itself.
  const snapWallPoint = useCallback(
    (point, excludeWallId) => {
      const corner = nearestWallEndpoint(point, walls, CORNER_SNAP_PX / stageScale, excludeWallId);
      if (corner) return corner;
      return snapToGrid ? { x: snapValue(point.x, GRID_SIZE), y: snapValue(point.y, GRID_SIZE) } : point;
    },
    [walls, stageScale, snapToGrid]
  );

  const computeSnappedPoint = useCallback(
    (stage) => {
      const raw = getWorldPoint(stage);
      if (tool === 'wall') {
        const corner = nearestWallEndpoint(raw, walls, CORNER_SNAP_PX / stageScale, null);
        if (corner) return corner;
      }
      let point = snapToGrid ? { x: snapValue(raw.x, GRID_SIZE), y: snapValue(raw.y, GRID_SIZE) } : raw;
      const chainStart = tool === 'freeform' ? freeformPoints[freeformPoints.length - 1] : wallStart;
      if (chainStart) point = snapAngle(chainStart, point, 15);
      return point;
    },
    [getWorldPoint, snapToGrid, wallStart, tool, freeformPoints, walls, stageScale]
  );

  // Snaps furniture (mainly doors/windows) exactly onto a nearby wall's
  // centerline while dragging, with rotation matched to the wall's angle —
  // otherwise a plain grid snap can leave a door sitting just in front of
  // or behind the wall it was dropped on. Falls back to the grid.
  const snapFurniturePoint = useCallback(
    (item, point) => {
      if (item.type === 'door' || item.type === 'window') {
        const threshold = Math.max(40, (item.depth || 10) * 3, 25 / stageScale);
        const hit = nearestWallLinePoint(point, walls, threshold);
        if (hit) return { x: hit.point.x, y: hit.point.y, rotation: hit.angle };
      }
      return snapToGrid ? { x: snapValue(point.x, GRID_SIZE), y: snapValue(point.y, GRID_SIZE) } : point;
    },
    [walls, snapToGrid, stageScale]
  );

  const handleStageMouseDown = useCallback(
    (e) => {
      const stage = stageRef.current;
      if (!stage) return;
      const clickedOnEmpty = e.target === stage;

      // Shift+drag on empty canvas starts a marquee (rectangle) selection
      // instead of panning. Turning off the Stage's own dragging here,
      // imperatively, takes effect before Konva's drag-start logic runs
      // for this same mousedown — a plain re-render wouldn't be in time.
      if (tool === 'select' && clickedOnEmpty && e.evt.shiftKey) {
        stage.draggable(false);
        const point = getWorldPoint(stage);
        setMarquee({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
        return;
      }

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

      if (clickedOnEmpty) {
        if (tool === 'measure') clearMeasureElements();
        else clearSelection();
      }
    },
    [tool, wallStart, wallThickness, computeSnappedPoint, addWall, clearSelection, clearMeasureElements, getWorldPoint]
  );

  const handleStageMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (marquee) {
      const point = getWorldPoint(stage);
      setMarquee((m) => (m ? { ...m, x2: point.x, y2: point.y } : m));
      return;
    }
    const active = (tool === 'wall' && wallStart) || (tool === 'freeform' && freeformPoints.length > 0);
    if (!active) return;
    setPreviewPoint(computeSnappedPoint(stage));
  }, [tool, wallStart, freeformPoints, computeSnappedPoint, marquee, getWorldPoint]);

  // Finalizes the marquee on mouse-up anywhere in the window (not just over
  // the canvas), so a drag that ends outside it still completes cleanly.
  useEffect(() => {
    if (!marquee) return;
    const finalize = () => {
      const x1 = Math.min(marquee.x1, marquee.x2);
      const x2 = Math.max(marquee.x1, marquee.x2);
      const y1 = Math.min(marquee.y1, marquee.y2);
      const y2 = Math.max(marquee.y1, marquee.y2);
      const overlaps = (minX, minY, maxX, maxY) => !(maxX < x1 || minX > x2 || maxY < y1 || minY > y2);
      const hits = [];
      visibleWalls.forEach((w) => {
        const minX = Math.min(w.x1, w.x2);
        const maxX = Math.max(w.x1, w.x2);
        const minY = Math.min(w.y1, w.y2);
        const maxY = Math.max(w.y1, w.y2);
        if (overlaps(minX, minY, maxX, maxY)) hits.push({ id: w.id, kind: 'wall' });
      });
      visibleFurniture.forEach((f) => {
        const pts = furnitureFootprint(f);
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        if (overlaps(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))) {
          hits.push({ id: f.id, kind: 'furniture' });
        }
      });
      visibleShapes.forEach((s) => {
        const xs = s.points.map((p) => p.x);
        const ys = s.points.map((p) => p.y);
        if (overlaps(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys))) {
          hits.push({ id: s.id, kind: 'shape' });
        }
      });
      if (hits.length > 0) selectMany(hits, true);
      setMarquee(null);
      const stage = stageRef.current;
      if (stage) stage.draggable(tool === 'select');
    };
    window.addEventListener('mouseup', finalize);
    return () => window.removeEventListener('mouseup', finalize);
  }, [marquee, visibleWalls, visibleFurniture, visibleShapes, selectMany, tool]);

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
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length > 0) {
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
  }, [selection, removeSelected, undo, redo, endWallDraft, endFreeformDraft, finishFreeform, tool, copySelected, pasteClipboard]);

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

  // When the dragged item is part of a multi-selection, move the whole
  // selection by the same delta instead of just that one item.
  const isGroupDrag = useCallback(
    (id, kind) => selection.length > 1 && selection.some((s) => s.id === id && s.kind === kind),
    [selection]
  );

  const handleWallDragEnd = useCallback(
    (id, patch) => {
      if (isGroupDrag(id, 'wall')) {
        const wall = walls.find((w) => w.id === id);
        if (wall) translateSelection(patch.x1 - wall.x1, patch.y1 - wall.y1);
        return;
      }
      updateWall(id, patch);
    },
    [isGroupDrag, walls, translateSelection, updateWall]
  );

  const handleFurnitureDragEnd = useCallback(
    (id, patch) => {
      if (isGroupDrag(id, 'furniture')) {
        const item = furniture.find((f) => f.id === id);
        if (item) translateSelection(patch.x - item.x, patch.y - item.y);
        return;
      }
      updateFurniture(id, patch);
    },
    [isGroupDrag, furniture, translateSelection, updateFurniture]
  );

  const handleShapeDragEnd = useCallback(
    (id, patch) => {
      if (isGroupDrag(id, 'shape')) {
        const shape = shapes.find((s) => s.id === id);
        if (shape?.points?.[0] && patch.points?.[0]) {
          translateSelection(patch.points[0].x - shape.points[0].x, patch.points[0].y - shape.points[0].y);
        }
        return;
      }
      updateShape(id, patch);
    },
    [isGroupDrag, shapes, translateSelection, updateShape]
  );

  const findByKind = useCallback(
    (id, kind) =>
      kind === 'wall' ? walls.find((w) => w.id === id) : kind === 'furniture' ? furniture.find((f) => f.id === id) : shapes.find((s) => s.id === id),
    [walls, furniture, shapes]
  );

  // While the "measure" tool has two elements picked (walls, furniture or
  // shapes, in any combination), draw a dimension line between their
  // closest points, so the gap between them is visible at a glance.
  const measureLine = useMemo(() => {
    if (tool !== 'measure' || measureIds.length !== 2) return null;
    const [pickA, pickB] = measureIds;
    const elA = findByKind(pickA.id, pickA.kind);
    const elB = findByKind(pickB.id, pickB.kind);
    if (!elA || !elB) return null;
    const { distance: dist, pointA, pointB } = elementDistance(elA, pickA.kind, elB, pickB.kind);
    return { points: [pointA.x, pointA.y, pointB.x, pointB.y], distance: dist };
  }, [tool, measureIds, findByKind]);

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
        style={{ cursor: tool === 'wall' || tool === 'measure' ? 'crosshair' : 'default' }}
      >
        <Layer listening={false}>
          <GridLines width={size.width} height={size.height} stageScale={stageScale} stagePos={stagePos} />
        </Layer>

        <Layer>
          {visibleShapes.map((shape) => (
            <FreeformShape
              key={shape.id}
              shape={shape}
              isSelected={
                tool === 'measure'
                  ? measureIds.some((m) => m.id === shape.id && m.kind === 'shape')
                  : selection.some((s) => s.id === shape.id && s.kind === 'shape')
              }
              draggable={tool === 'select'}
              onSelect={(id, additive) =>
                tool === 'measure' ? toggleMeasureElement(id, 'shape') : select(id, 'shape', additive)
              }
              onDragEnd={handleShapeDragEnd}
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
              isSelected={
                tool === 'measure'
                  ? measureIds.some((m) => m.id === w.id && m.kind === 'wall')
                  : selection.some((s) => s.id === w.id && s.kind === 'wall')
              }
              draggable={tool === 'select'}
              onSelect={(id, additive) =>
                tool === 'measure' ? toggleMeasureElement(id, 'wall') : select(id, 'wall', additive)
              }
              onDragEnd={handleWallDragEnd}
              onEndpointDragEnd={(id, patch) => updateWall(id, patch)}
              snapPoint={(point) => snapWallPoint(point, w.id)}
            />
          ))}
          {previewLinePoints && (
            <Line points={previewLinePoints} stroke="#e94560" strokeWidth={wallThickness} dash={[10, 6]} opacity={0.7} />
          )}
          {measureLine && (
            <>
              <Line points={measureLine.points} stroke="#0a7d4a" strokeWidth={2} dash={[6, 4]} />
              <Circle x={measureLine.points[0]} y={measureLine.points[1]} radius={4} fill="#0a7d4a" />
              <Circle x={measureLine.points[2]} y={measureLine.points[3]} radius={4} fill="#0a7d4a" />
              <Text
                text={formatLength(measureLine.distance)}
                x={(measureLine.points[0] + measureLine.points[2]) / 2}
                y={(measureLine.points[1] + measureLine.points[3]) / 2}
                fontSize={13}
                fontStyle="bold"
                fill="#0a7d4a"
                offsetX={20}
                offsetY={18}
                padding={2}
              />
            </>
          )}
        </Layer>

        <Layer>
          {visibleFurniture.map((item) => (
            <FurnitureShape
              key={item.id}
              item={item}
              isSelected={
                tool === 'measure'
                  ? measureIds.some((m) => m.id === item.id && m.kind === 'furniture')
                  : selection.some((s) => s.id === item.id && s.kind === 'furniture')
              }
              draggable={tool === 'select'}
              onSelect={(id, additive) =>
                tool === 'measure' ? toggleMeasureElement(id, 'furniture') : select(id, 'furniture', additive)
              }
              onDragEnd={handleFurnitureDragEnd}
              snapDrag={(x, y) => snapFurniturePoint(item, { x, y })}
              shapeRef={(node) => {
                if (node) shapeRefs.current[item.id] = node;
                else delete shapeRefs.current[item.id];
              }}
            />
          ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            // Default is 50 (world cm) — far enough above a selected item's
            // top edge to land on a different piece of furniture placed
            // nearby, which can eat that item's next click entirely (the
            // click lands on the invisible rotate handle instead). A small
            // room's furniture is routinely closer together than that.
            rotateAnchorOffset={16}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
            boundBoxFunc={(oldBox, newBox) => {
              // The box here is in on-screen pixels, so a fixed pixel floor
              // (a) blocks rotation entirely once a thin item's screen size
              // drops under it, and (b) blocks resizing that thin axis even
              // further, or — the bug reported here — blocks GROWING the
              // *other* axis too, because the check didn't distinguish which
              // axis was actually shrinking. Fix: convert the floor to real
              // cm (so it no longer depends on current zoom), and only ever
              // reject an axis that is both shrinking and would end up
              // under that floor; growing, or an unchanged thin axis, is
              // always allowed.
              const minPx = 5 * stageScale; // ~5cm minimum, in current screen pixels
              const widthShrinking = newBox.width < oldBox.width && newBox.width < minPx;
              const heightShrinking = newBox.height < oldBox.height && newBox.height < minPx;
              if (widthShrinking || heightShrinking) return oldBox;
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

        {marquee && (
          <Layer listening={false}>
            <Rect
              x={Math.min(marquee.x1, marquee.x2)}
              y={Math.min(marquee.y1, marquee.y2)}
              width={Math.abs(marquee.x2 - marquee.x1)}
              height={Math.abs(marquee.y2 - marquee.y1)}
              fill="rgba(37,99,235,0.12)"
              stroke="#2563eb"
              strokeWidth={1 / stageScale}
              dash={[6 / stageScale, 4 / stageScale]}
            />
          </Layer>
        )}
      </Stage>

      <div className="canvas-hint">
        {tool === 'wall' && (wallStart ? 'Klicken zum Setzen des nächsten Punkts · Rechtsklick/Esc zum Beenden' : 'Klicken zum Start einer Wand')}
        {tool === 'freeform' &&
          (freeformPoints.length > 0
            ? 'Klicken für weitere Ecken · Rechtsklick/Enter zum Schließen · Esc zum Abbrechen'
            : 'Klicken zum Start einer Freiformfläche')}
        {tool === 'select' &&
          (selection.length > 1
            ? `${selection.length} Elemente ausgewählt · Ziehen zum gemeinsamen Verschieben · Entf zum Löschen`
            : 'Ziehen zum Verschieben · Shift+Klick/Ziehen für Mehrfachauswahl · Entf zum Löschen · Strg+C/V zum Kopieren · Mausrad zum Zoomen')}
        {tool === 'measure' &&
          (measureIds.length < 2
            ? `Zwei Elemente anklicken (Wände, Möbel oder Flächen), um den Abstand zu messen (${measureIds.length}/2 gewählt)`
            : 'Abstand rechts bearbeiten · Klick auf freie Fläche zum Zurücksetzen')}
      </div>
    </div>
  );
}
