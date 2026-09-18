import { useState } from 'react';
import { FURNITURE_CATALOG } from '../data/furnitureCatalog';
import { useDesignStore } from '../store/useDesignStore';

export default function FurniturePalette() {
  const [openCategory, setOpenCategory] = useState(FURNITURE_CATALOG[0].category);
  const addFurniture = useDesignStore((s) => s.addFurniture);
  const select = useDesignStore((s) => s.select);
  const setTool = useDesignStore((s) => s.setTool);

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/furniture-type', item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClickAdd = (item) => {
    setTool('select');
    const id = addFurniture({
      type: item.type,
      label: item.label,
      color: item.color,
      width: item.width,
      depth: item.depth,
      height: item.height,
      x: 200,
      y: 200,
      rotation: 0,
    });
    select(id, 'furniture');
  };

  return (
    <aside className="palette">
      <h2>Möbel</h2>
      <p className="palette-hint">Auf den Grundriss ziehen, oder anklicken zum Einfügen.</p>
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
