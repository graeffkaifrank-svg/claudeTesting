import { useState } from 'react';
import { useDesignStore } from '../store/useDesignStore';

export default function LayerPanel({ onClose }) {
  const layers = useDesignStore((s) => s.layers);
  const activeLayerId = useDesignStore((s) => s.activeLayerId);
  const setActiveLayer = useDesignStore((s) => s.setActiveLayer);
  const toggleLayerVisibility = useDesignStore((s) => s.toggleLayerVisibility);
  const renameLayer = useDesignStore((s) => s.renameLayer);
  const addLayer = useDesignStore((s) => s.addLayer);
  const removeLayer = useDesignStore((s) => s.removeLayer);

  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState('');

  const startEdit = (layer) => {
    setEditingId(layer.id);
    setDraftName(layer.name);
  };

  const commitEdit = () => {
    if (editingId && draftName.trim()) renameLayer(editingId, draftName.trim());
    setEditingId(null);
  };

  return (
    <div className="layer-panel" onClick={(e) => e.stopPropagation()}>
      <div className="layer-panel-header">
        <span>Ebenen</span>
        <button type="button" onClick={onClose} title="Schließen">✕</button>
      </div>
      <ul className="layer-list">
        {layers.map((layer) => (
          <li key={layer.id} className={layer.id === activeLayerId ? 'layer-row active' : 'layer-row'}>
            <button
              type="button"
              className="layer-visibility"
              onClick={() => toggleLayerVisibility(layer.id)}
              title={layer.visible ? 'Ebene ausblenden' : 'Ebene einblenden'}
            >
              {layer.visible ? '👁' : '🚫'}
            </button>
            {editingId === layer.id ? (
              <input
                autoFocus
                className="layer-name-input"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <button
                type="button"
                className="layer-name"
                onClick={() => setActiveLayer(layer.id)}
                onDoubleClick={() => startEdit(layer)}
                title="Klicken: als aktive Ebene wählen · Doppelklick: umbenennen"
              >
                {layer.name}
              </button>
            )}
            <button
              type="button"
              className="layer-remove"
              onClick={() => removeLayer(layer.id)}
              disabled={layers.length <= 1}
              title="Ebene löschen"
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="layer-add" onClick={() => addLayer()}>
        + Neue Ebene
      </button>
      <p className="layer-hint">Aktive Ebene: neue Elemente landen dort. Ausgeblendete Ebenen sind auch in der 3D-Ansicht versteckt.</p>
    </div>
  );
}
