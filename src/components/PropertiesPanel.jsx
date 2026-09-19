import { useEffect, useState } from 'react';
import { useDesignStore } from '../store/useDesignStore';
import { formatLength, cmToMeters } from '../utils/geometry';

function NumberField({ label, value, onChange, step = 1, min, max, suffix }) {
  const display = Number.isFinite(value) ? Math.round(value * 100) / 100 : '';
  // Keep what's on screen as free-typed text while the field is focused, and
  // only snap it back to the (rounded) numeric value on blur. A plain
  // controlled `value={number}` re-formats on every keystroke, so clearing
  // the field to type a fresh number immediately bounces back to "0" with
  // the cursor at the end — every next digit lands after that stray zero.
  const [draft, setDraft] = useState(String(display));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(display));
  }, [display, focused]);

  return (
    <label className="prop-field">
      <span>{label}</span>
      <span className="prop-input">
        <input
          type="number"
          value={draft}
          step={step}
          min={min}
          max={max}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            setDraft(e.target.value);
            const num = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(num)) onChange(num);
          }}
          onBlur={() => {
            setFocused(false);
            if (draft === '' || !Number.isFinite(Number(draft))) setDraft(String(display));
          }}
        />
        {suffix && <span className="prop-suffix">{suffix}</span>}
      </span>
    </label>
  );
}

function LayerField({ layerId, onChange }) {
  const layers = useDesignStore((s) => s.layers);
  if (layers.length <= 1) return null;
  return (
    <label className="prop-field">
      <span>Ebene</span>
      <select value={layerId ?? layers[0].id} onChange={(e) => onChange(e.target.value)}>
        {layers.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function WallProperties({ wall }) {
  const updateWall = useDesignStore((s) => s.updateWall);
  const removeWall = useDesignStore((s) => s.removeWall);
  const length = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
  const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);

  const setLength = (newLenM) => {
    const newLen = Math.max(10, newLenM * 100);
    updateWall(wall.id, {
      x2: wall.x1 + Math.cos(angle) * newLen,
      y2: wall.y1 + Math.sin(angle) * newLen,
    });
  };

  return (
    <div className="props">
      <h3>Wand</h3>
      <NumberField label="Länge" value={cmToMeters(length)} step={0.05} min={0.1} suffix="m" onChange={setLength} />
      <NumberField
        label="Stärke"
        value={wall.thickness}
        step={1}
        min={5}
        suffix="cm"
        onChange={(v) => updateWall(wall.id, { thickness: Math.max(5, v) })}
      />
      <LayerField layerId={wall.layerId} onChange={(layerId) => updateWall(wall.id, { layerId })} />
      <button type="button" className="danger" onClick={() => removeWall(wall.id)}>
        Wand löschen
      </button>
    </div>
  );
}

function FurnitureProperties({ item }) {
  const updateFurniture = useDesignStore((s) => s.updateFurniture);
  const removeFurniture = useDesignStore((s) => s.removeFurniture);

  return (
    <div className="props">
      <h3>{item.label}</h3>
      <label className="prop-field">
        <span>Bezeichnung</span>
        <input
          type="text"
          value={item.label}
          onChange={(e) => updateFurniture(item.id, { label: e.target.value })}
        />
      </label>
      <NumberField
        label="Breite"
        value={item.width}
        step={1}
        min={10}
        suffix="cm"
        onChange={(v) => updateFurniture(item.id, { width: Math.max(10, v) })}
      />
      <NumberField
        label="Tiefe"
        value={item.depth}
        step={1}
        min={10}
        suffix="cm"
        onChange={(v) => updateFurniture(item.id, { depth: Math.max(10, v) })}
      />
      <NumberField
        label="Drehung"
        value={item.rotation}
        step={5}
        onChange={(v) => updateFurniture(item.id, { rotation: v % 360 })}
        suffix="°"
      />
      <label className="prop-field">
        <span>Farbe</span>
        <input
          type="color"
          value={item.color}
          onChange={(e) => updateFurniture(item.id, { color: e.target.value })}
        />
      </label>
      <NumberField
        label="Schriftgröße"
        value={item.fontSize ?? Math.min(item.shape === 'zone' ? 16 : 14, item.width / 6, item.depth / 2)}
        step={1}
        min={6}
        max={72}
        suffix="pt"
        onChange={(v) => updateFurniture(item.id, { fontSize: Math.max(6, v) })}
      />
      <NumberField
        label="Deckkraft"
        value={Math.round((item.opacity ?? 1) * 100)}
        step={5}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => updateFurniture(item.id, { opacity: Math.min(100, Math.max(0, v)) / 100 })}
      />
      <LayerField layerId={item.layerId} onChange={(layerId) => updateFurniture(item.id, { layerId })} />
      <button type="button" className="danger" onClick={() => removeFurniture(item.id)}>
        Objekt löschen
      </button>
    </div>
  );
}

function ShapeProperties({ shape }) {
  const updateShape = useDesignStore((s) => s.updateShape);
  const removeShape = useDesignStore((s) => s.removeShape);

  return (
    <div className="props">
      <h3>Freiformfläche</h3>
      <label className="prop-field">
        <span>Bezeichnung</span>
        <input
          type="text"
          value={shape.label}
          onChange={(e) => updateShape(shape.id, { label: e.target.value })}
        />
      </label>
      <NumberField
        label="Höhe"
        value={shape.height}
        step={5}
        min={1}
        suffix="cm"
        onChange={(v) => updateShape(shape.id, { height: Math.max(1, v) })}
      />
      <label className="prop-field">
        <span>Farbe</span>
        <input
          type="color"
          value={shape.color}
          onChange={(e) => updateShape(shape.id, { color: e.target.value })}
        />
      </label>
      <NumberField
        label="Schriftgröße"
        value={shape.fontSize ?? 13}
        step={1}
        min={6}
        max={72}
        suffix="pt"
        onChange={(v) => updateShape(shape.id, { fontSize: Math.max(6, v) })}
      />
      <NumberField
        label="Deckkraft"
        value={Math.round((shape.opacity ?? 1) * 100)}
        step={5}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => updateShape(shape.id, { opacity: Math.min(100, Math.max(0, v)) / 100 })}
      />
      <LayerField layerId={shape.layerId} onChange={(layerId) => updateShape(shape.id, { layerId })} />
      <p className="props-empty-hint">Eckpunkte lassen sich direkt im Grundriss anfassen und verschieben.</p>
      <button type="button" className="danger" onClick={() => removeShape(shape.id)}>
        Fläche löschen
      </button>
    </div>
  );
}

function SummaryProperties() {
  const walls = useDesignStore((s) => s.walls);
  const furniture = useDesignStore((s) => s.furniture);
  const shapes = useDesignStore((s) => s.shapes);
  const totalWallLength = walls.reduce((sum, w) => sum + Math.hypot(w.x2 - w.x1, w.y2 - w.y1), 0);

  return (
    <div className="props">
      <h3>Übersicht</h3>
      <p className="prop-summary-line">
        <strong>{walls.length}</strong> Wände · <strong>{formatLength(totalWallLength)}</strong> gesamt
      </p>
      <p className="prop-summary-line">
        <strong>{furniture.length}</strong> Möbelstücke
      </p>
      {shapes.length > 0 && (
        <p className="prop-summary-line">
          <strong>{shapes.length}</strong> Freiformflächen
        </p>
      )}
      <p className="props-empty-hint">
        Wähle ein Element aus, um Details zu bearbeiten.
      </p>
    </div>
  );
}

export default function PropertiesPanel() {
  const selectedId = useDesignStore((s) => s.selectedId);
  const selectedKind = useDesignStore((s) => s.selectedKind);
  const walls = useDesignStore((s) => s.walls);
  const furniture = useDesignStore((s) => s.furniture);
  const shapes = useDesignStore((s) => s.shapes);

  let content;
  if (selectedKind === 'wall') {
    const wall = walls.find((w) => w.id === selectedId);
    content = wall ? <WallProperties wall={wall} /> : <SummaryProperties />;
  } else if (selectedKind === 'furniture') {
    const item = furniture.find((f) => f.id === selectedId);
    content = item ? <FurnitureProperties item={item} /> : <SummaryProperties />;
  } else if (selectedKind === 'shape') {
    const shape = shapes.find((s) => s.id === selectedId);
    content = shape ? <ShapeProperties shape={shape} /> : <SummaryProperties />;
  } else {
    content = <SummaryProperties />;
  }

  return <aside className="properties">{content}</aside>;
}
