import { useDesignStore } from '../store/useDesignStore';
import { formatLength, cmToMeters } from '../utils/geometry';

function NumberField({ label, value, onChange, step = 1, min, suffix }) {
  return (
    <label className="prop-field">
      <span>{label}</span>
      <span className="prop-input">
        <input
          type="number"
          value={Number.isFinite(value) ? Math.round(value * 100) / 100 : ''}
          step={step}
          min={min}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="prop-suffix">{suffix}</span>}
      </span>
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
      <button type="button" className="danger" onClick={() => removeFurniture(item.id)}>
        Objekt löschen
      </button>
    </div>
  );
}

function SummaryProperties() {
  const walls = useDesignStore((s) => s.walls);
  const furniture = useDesignStore((s) => s.furniture);
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
      <p className="props-empty-hint">
        Wähle eine Wand oder ein Möbelstück aus, um Details zu bearbeiten.
      </p>
    </div>
  );
}

export default function PropertiesPanel() {
  const selectedId = useDesignStore((s) => s.selectedId);
  const selectedKind = useDesignStore((s) => s.selectedKind);
  const walls = useDesignStore((s) => s.walls);
  const furniture = useDesignStore((s) => s.furniture);

  let content;
  if (selectedKind === 'wall') {
    const wall = walls.find((w) => w.id === selectedId);
    content = wall ? <WallProperties wall={wall} /> : <SummaryProperties />;
  } else if (selectedKind === 'furniture') {
    const item = furniture.find((f) => f.id === selectedId);
    content = item ? <FurnitureProperties item={item} /> : <SummaryProperties />;
  } else {
    content = <SummaryProperties />;
  }

  return <aside className="properties">{content}</aside>;
}
