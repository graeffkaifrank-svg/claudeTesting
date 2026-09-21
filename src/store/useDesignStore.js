import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

const DEFAULT_WALL_THICKNESS = 15; // cm
export const GRID_SIZE = 20; // cm

const defaultLayers = () => [{ id: uuid(), name: 'Standard', visible: true }];

const emptyDesign = () => {
  const layers = defaultLayers();
  return {
    name: 'Neuer Entwurf',
    walls: [],
    furniture: [],
    shapes: [],
    layers,
    activeLayerId: layers[0].id,
  };
};

function snapshot(state) {
  return {
    walls: state.walls,
    furniture: state.furniture,
    shapes: state.shapes,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    name: state.name,
  };
}

export const useDesignStore = create((set, get) => ({
  ...emptyDesign(),

  tool: 'select', // 'select' | 'wall' | 'freeform'
  wallThickness: DEFAULT_WALL_THICKNESS,
  snapToGrid: true,
  selectedId: null,
  selectedKind: null, // 'wall' | 'furniture' | 'shape'
  clipboard: null, // { kind: 'wall' | 'furniture' | 'shape', data: {...} }
  measureWallIds: [], // up to 2 wall ids picked while tool === 'measure'
  past: [],
  future: [],
  dirty: false,

  setTool: (tool) => set({ tool, selectedId: null, selectedKind: null, measureWallIds: [] }),
  setWallThickness: (wallThickness) => set({ wallThickness }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setName: (name) => set({ name, dirty: true }),

  select: (id, kind) => set({ selectedId: id, selectedKind: kind }),
  clearSelection: () => set({ selectedId: null, selectedKind: null }),
  setClipboard: (clipboard) => set({ clipboard }),

  toggleMeasureWall: (id) => {
    set((state) => {
      if (state.measureWallIds.includes(id)) {
        return { measureWallIds: state.measureWallIds.filter((x) => x !== id) };
      }
      if (state.measureWallIds.length >= 2) {
        return { measureWallIds: [state.measureWallIds[1], id] };
      }
      return { measureWallIds: [...state.measureWallIds, id] };
    });
  },
  clearMeasureWalls: () => set({ measureWallIds: [] }),

  pushHistory: () => {
    const state = get();
    set({ past: [...state.past, snapshot(state)].slice(-50), future: [] });
  },

  undo: () => {
    const state = get();
    if (state.past.length === 0) return;
    const previous = state.past[state.past.length - 1];
    set({
      ...previous,
      past: state.past.slice(0, -1),
      future: [snapshot(state), ...state.future],
      selectedId: null,
      selectedKind: null,
    });
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return;
    const next = state.future[0];
    set({
      ...next,
      past: [...state.past, snapshot(state)],
      future: state.future.slice(1),
      selectedId: null,
      selectedKind: null,
    });
  },

  addWall: (wall) => {
    get().pushHistory();
    set((state) => ({
      walls: [...state.walls, { id: uuid(), thickness: state.wallThickness, layerId: state.activeLayerId, ...wall }],
      dirty: true,
    }));
  },

  updateWall: (id, patch, { record = true } = {}) => {
    if (record) get().pushHistory();
    set((state) => ({
      walls: state.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      dirty: true,
    }));
  },

  removeWall: (id) => {
    get().pushHistory();
    set((state) => ({
      walls: state.walls.filter((w) => w.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
      measureWallIds: state.measureWallIds.filter((x) => x !== id),
      dirty: true,
    }));
  },

  addFurniture: (item) => {
    get().pushHistory();
    const id = uuid();
    set((state) => ({
      furniture: [...state.furniture, { id, rotation: 0, layerId: state.activeLayerId, ...item }],
      dirty: true,
    }));
    return id;
  },

  updateFurniture: (id, patch, { record = true } = {}) => {
    if (record) get().pushHistory();
    set((state) => ({
      furniture: state.furniture.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      dirty: true,
    }));
  },

  removeFurniture: (id) => {
    get().pushHistory();
    set((state) => ({
      furniture: state.furniture.filter((f) => f.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
      dirty: true,
    }));
  },

  addShape: (shape) => {
    get().pushHistory();
    const id = uuid();
    set((state) => ({
      shapes: [
        ...state.shapes,
        { id, color: '#9aa5b1', label: 'Fläche', height: 250, layerId: state.activeLayerId, ...shape },
      ],
      dirty: true,
    }));
    return id;
  },

  updateShape: (id, patch, { record = true } = {}) => {
    if (record) get().pushHistory();
    set((state) => ({
      shapes: state.shapes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      dirty: true,
    }));
  },

  removeShape: (id) => {
    get().pushHistory();
    set((state) => ({
      shapes: state.shapes.filter((s) => s.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
      dirty: true,
    }));
  },

  removeSelected: () => {
    const { selectedId, selectedKind } = get();
    if (!selectedId) return;
    if (selectedKind === 'wall') get().removeWall(selectedId);
    if (selectedKind === 'furniture') get().removeFurniture(selectedId);
    if (selectedKind === 'shape') get().removeShape(selectedId);
  },

  copySelected: () => {
    const { selectedId, selectedKind, walls, furniture, shapes } = get();
    if (!selectedId || !selectedKind) return;
    const list = selectedKind === 'wall' ? walls : selectedKind === 'furniture' ? furniture : shapes;
    const item = list.find((i) => i.id === selectedId);
    if (!item) return;
    const { id: _id, ...data } = item;
    set({ clipboard: { kind: selectedKind, data: structuredClone(data) } });
  },

  pasteClipboard: () => {
    const { clipboard } = get();
    if (!clipboard) return;
    const OFFSET = 30; // cm
    const { kind, data } = clipboard;

    if (kind === 'wall') {
      const next = { ...data, x1: data.x1 + OFFSET, y1: data.y1 + OFFSET, x2: data.x2 + OFFSET, y2: data.y2 + OFFSET };
      get().addWall(next);
      set({ clipboard: { kind, data: next } });
      const created = get().walls[get().walls.length - 1];
      get().select(created.id, 'wall');
    } else if (kind === 'furniture') {
      const next = { ...data, x: data.x + OFFSET, y: data.y + OFFSET };
      const id = get().addFurniture(next);
      set({ clipboard: { kind, data: next } });
      get().select(id, 'furniture');
    } else if (kind === 'shape') {
      const next = { ...data, points: data.points.map((p) => ({ x: p.x + OFFSET, y: p.y + OFFSET })) };
      const id = get().addShape(next);
      set({ clipboard: { kind, data: next } });
      get().select(id, 'shape');
    }
  },

  addLayer: (name) => {
    get().pushHistory();
    const id = uuid();
    set((state) => ({
      layers: [...state.layers, { id, name: name || `Ebene ${state.layers.length + 1}`, visible: true }],
      activeLayerId: id,
      dirty: true,
    }));
    return id;
  },

  renameLayer: (id, name) => {
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, name } : l)),
      dirty: true,
    }));
  },

  toggleLayerVisibility: (id) => {
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    }));
  },

  setActiveLayer: (id) => set({ activeLayerId: id }),

  removeLayer: (id) => {
    const state = get();
    if (state.layers.length <= 1) return;
    get().pushHistory();
    const remaining = state.layers.filter((l) => l.id !== id);
    const fallbackId = remaining[0].id;
    set((s) => ({
      layers: remaining,
      activeLayerId: s.activeLayerId === id ? fallbackId : s.activeLayerId,
      walls: s.walls.map((w) => (w.layerId === id ? { ...w, layerId: fallbackId } : w)),
      furniture: s.furniture.map((f) => (f.layerId === id ? { ...f, layerId: fallbackId } : f)),
      shapes: s.shapes.map((sh) => (sh.layerId === id ? { ...sh, layerId: fallbackId } : sh)),
      dirty: true,
    }));
  },

  newDesign: () =>
    set({
      ...emptyDesign(),
      selectedId: null,
      selectedKind: null,
      clipboard: null,
      measureWallIds: [],
      past: [],
      future: [],
      dirty: false,
    }),

  loadDesign: (data) => {
    const layers = Array.isArray(data.layers) && data.layers.length > 0 ? data.layers : defaultLayers();
    const fallbackLayerId = layers[0].id;
    const withLayer = (arr) =>
      (Array.isArray(arr) ? arr : []).map((item) => ({ layerId: fallbackLayerId, ...item }));
    set({
      name: data.name ?? 'Importierter Entwurf',
      walls: withLayer(data.walls),
      furniture: withLayer(data.furniture),
      shapes: withLayer(data.shapes),
      layers,
      activeLayerId: data.activeLayerId && layers.some((l) => l.id === data.activeLayerId) ? data.activeLayerId : fallbackLayerId,
      selectedId: null,
      selectedKind: null,
      clipboard: null,
      measureWallIds: [],
      past: [],
      future: [],
      dirty: false,
    });
  },

  markSaved: () => set({ dirty: false }),

  toJSON: () => {
    const state = get();
    return {
      version: 2,
      name: state.name,
      walls: state.walls,
      furniture: state.furniture,
      shapes: state.shapes,
      layers: state.layers,
      activeLayerId: state.activeLayerId,
      savedAt: new Date().toISOString(),
    };
  },
}));
