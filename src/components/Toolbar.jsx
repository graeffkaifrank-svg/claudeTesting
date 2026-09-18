import { useRef } from 'react';
import { useDesignStore } from '../store/useDesignStore';
import { downloadJSON, readJSONFile, designFilename } from '../utils/fileIO';

export default function Toolbar({ onOpen3D }) {
  const fileInputRef = useRef(null);

  const name = useDesignStore((s) => s.name);
  const setName = useDesignStore((s) => s.setName);
  const tool = useDesignStore((s) => s.tool);
  const setTool = useDesignStore((s) => s.setTool);
  const snapToGrid = useDesignStore((s) => s.snapToGrid);
  const setSnapToGrid = useDesignStore((s) => s.setSnapToGrid);
  const wallThickness = useDesignStore((s) => s.wallThickness);
  const setWallThickness = useDesignStore((s) => s.setWallThickness);
  const newDesign = useDesignStore((s) => s.newDesign);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const toJSON = useDesignStore((s) => s.toJSON);
  const markSaved = useDesignStore((s) => s.markSaved);
  const dirty = useDesignStore((s) => s.dirty);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const past = useDesignStore((s) => s.past);
  const future = useDesignStore((s) => s.future);
  const removeSelected = useDesignStore((s) => s.removeSelected);
  const selectedId = useDesignStore((s) => s.selectedId);

  const handleNew = () => {
    if (dirty && !window.confirm('Aktueller Entwurf wurde nicht gespeichert. Trotzdem neu beginnen?')) return;
    newDesign();
  };

  const handleSave = () => {
    downloadJSON(toJSON(), designFilename(name));
    markSaved();
  };

  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await readJSONFile(file);
      loadDesign(data);
    } catch {
      window.alert('Datei konnte nicht gelesen werden: Ungültiges JSON.');
    }
  };

  return (
    <header className="toolbar">
      <div className="toolbar-row">
        <input
          className="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Projektname"
        />

        <div className="toolbar-group">
          <button type="button" onClick={handleNew}>Neu</button>
          <button type="button" onClick={handleSave}>💾 Speichern</button>
          <button type="button" onClick={handleLoadClick}>📂 Laden</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={handleFileChange}
          />
        </div>

        <div className="toolbar-group">
          <button type="button" onClick={undo} disabled={past.length === 0} title="Rückgängig (Strg+Z)">↶</button>
          <button type="button" onClick={redo} disabled={future.length === 0} title="Wiederholen (Strg+Y)">↷</button>
        </div>

        <div className="toolbar-group">
          <button type="button" onClick={onOpen3D}>🧊 3D-Ansicht</button>
        </div>
      </div>

      <div className="toolbar-row">
        <div className="toolbar-group" role="group" aria-label="Werkzeug">
          <button type="button" className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')}>
            ➤ Auswählen
          </button>
          <button type="button" className={tool === 'wall' ? 'active' : ''} onClick={() => setTool('wall')}>
            🧱 Wand zeichnen
          </button>
        </div>

        {tool === 'wall' && (
          <label className="toolbar-field">
            Wandstärke
            <input
              type="number"
              min={5}
              max={50}
              step={1}
              value={wallThickness}
              onChange={(e) => setWallThickness(Number(e.target.value) || 15)}
            />
            cm
          </label>
        )}

        <label className="toolbar-field">
          <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
          Am Raster einrasten
        </label>

        <button type="button" onClick={removeSelected} disabled={!selectedId} title="Auswahl löschen (Entf)">
          🗑 Löschen
        </button>
      </div>
    </header>
  );
}
