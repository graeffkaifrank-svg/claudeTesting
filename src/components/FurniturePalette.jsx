import { useState } from 'react';
import { FURNITURE_CATALOG, SHAPE_PRESETS, rectPoints } from '../data/furnitureCatalog';
import { useDesignStore } from '../store/useDesignStore';

const SHAPE_CATEGORY = 'Freiformflächen';

export default function FurniturePalette() {
  const [openCategory, setOpenCategory] = useState(FURNITURE_CATALOG[0].category);
  const addFurniture = useDesignStore((s) => s.addFurniture);
  const addShape = useDesignStore((s) => s.addShape);
  const select = useDesignStore((s) => s.select);
  const setTool = useDesignStore((s) => s.setTool);

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/furniture-type', item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleShapeDragStart = (e, item) => {
    e.dataTransfer.setData('application/shape-type', item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClickAdd = (item) => {
    setTool('select');
    const id = addFurniture({
      ...item,
      x: 200,
      y: 200,
      rotation: 0,
    });
    select(id, 'furniture');
  };

  const handleClickAddShape = (item) => {
    setTool('select');
    const id = addShape({ ...item, points: rectPoints(200, 200, item.width, item.depth) });
    select(id, 'shape');
  };

  return (
    <aside className="palette">
      <h2>Möbel</h2>
      <p className="palette-hint">Auf den Grundriss ziehen, oder anklicken zum Einfügen.</p>
      <div className="palette-group">
        <button
          type="button"
          className="palette-group-header"
          onClick={() => setOpenCategory(openCategory === SHAPE_CATEGORY ? null : SHAPE_CATEGORY)}
        >
          <span>{SHAPE_CATEGORY}</span>
          <span>{openCategory === SHAPE_CATEGORY ? '−' : '+'}</span>
        </button>
        {openCategory === SHAPE_CATEGORY && (
          <div className="palette-items">
            {SHAPE_PRESETS.map((item) => (
              <div
                key={item.type}
                className="palette-item"
                draggable
                onDragStart={(e) => handleShapeDragStart(e, item)}
                onClick={() => handleClickAddShape(item)}
                title={`${item.label} (${item.width}×${item.depth} cm, Ecken frei verschiebbar)`}
              >
                <span className="palette-swatch" style={{ background: item.color }} />
                <span className="palette-label">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {FURNITURE_CATALOG.map((group) => (
        <div className="palette-group" key={group.category}>
          <button
            type="button"
            className="palette-group-header"
            onClick={() => setOpenCategory(openCategory === group.category ? null : group.category)}
          >
            <span>{group.category}</span>
            <span>{openCategory === group.category ? '−' : '+'}</span>
          </button>
          {openCategory === group.category && (
            <div className="palette-items">
              {group.items.map((item) => (
                <div
                  key={item.type}
                  className="palette-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onClick={() => handleClickAdd(item)}
                  title={`${item.label} (${item.width}×${item.depth} cm)`}
                >
                  <span className="palette-swatch" style={{ background: item.color }} />
                  <span className="palette-label">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}
