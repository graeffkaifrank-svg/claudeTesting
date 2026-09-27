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
  selectedId: null, // convenience mirror of selection[0] when exactly one item is selected
  selectedKind: null, // 'wall' | 'furniture' | 'shape'
  selection: [], // [{ id, kind }] — the full (possibly multi-item) selection
  clipboard: null, // [{ kind: 'wall' | 'furniture' | 'shape', data: {...} }]
  measureIds: [], // up to 2 { id, kind } picks while tool === 'measure'
  past: [],
  future: [],
  dirty: false,

  setTool: (tool) => set({ tool, selection: [], selectedId: null, selectedKind: null, measureIds: [] }),
  setWallThickness: (wallThickness) => set({ wallThickness }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setName: (name) => set({ name, dirty: true }),

  // `additive` (Shift-click) toggles the item in/out of the current
  // selection instead of replacing it, so several elements can be picked
  // at once. `selectedId`/`selectedKind` stay in sync as a convenience
  // mirror for the single-item property panels.
  select: (id, kind, additive = false) =>
    set((state) => {
      const matches = (s) => s.id === id && s.kind === kind;
      const nextSelection = additive
        ? state.selection.some(matches)
          ? state.selection.filter((s) => !matches(s))
          : [...state.selection, { id, kind }]
        : [{ id, kind }];
      const single = nextSelection.length === 1 ? nextSelection[0] : null;
      return { selection: nextSelection, selectedId: single?.id ?? null, selectedKind: single?.kind ?? null };
    }),

  // Replaces (or, if additive, unions with) the current selection — used by
  // marquee (drag-rectangle) selection.
  selectMany: (items, additive = false) =>
    set((state) => {
      let nextSelection;
      if (additive) {
        nextSelection = [...state.selection];
        for (const it of items) {
          if (!nextSelection.some((s) => s.id === it.id && s.kind === it.kind)) nextSelection.push(it);
        }
      } else {
        nextSelection = items;
      }
      const single = nextSelection.length === 1 ? nextSelection[0] : null;
      return { selection: nextSelection, selectedId: single?.id ?? null, selectedKind: single?.kind ?? null };
    }),

  clearSelection: () => set({ selection: [], selectedId: null, selectedKind: null }),
  setClipboard: (clipboard) => set({ clipboard }),

  // Elements can be walls, furniture or freeform shapes — kind disambiguates
  // ids that only need to be unique within their own array.
  toggleMeasureElement: (id, kind) => {
    set((state) => {
      const isPicked = (m) => m.id === id && m.kind === kind;
      if (state.measureIds.some(isPicked)) {
        return { measureIds: state.measureIds.filter((m) => !isPicked(m)) };
      }
      if (state.measureIds.length >= 2) {
        return { measureIds: [state.measureIds[1], { id, kind }] };
      }
      return { measureIds: [...state.measureIds, { id, kind }] };
    });
  },
  clearMeasureElements: () => set({ measureIds: [] }),

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
      selection: [],
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
      selection: [],
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
      selection: state.selection.filter((s) => !(s.id === id && s.kind === 'wall')),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
      measureIds: state.measureIds.filter((m) => !(m.id === id && m.kind === 'wall')),
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
      selection: state.selection.filter((s) => !(s.id === id && s.kind === 'furniture')),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
      measureIds: state.measureIds.filter((m) => !(m.id === id && m.kind === 'furniture')),
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
      selection: state.selection.filter((s) => !(s.id === id && s.kind === 'shape')),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedKind: state.selectedId === id ? null : state.selectedKind,
      measureIds: state.measureIds.filter((m) => !(m.id === id && m.kind === 'shape')),
      dirty: true,
    }));
  },

  // Deletes every element currently in `selection` as one undo step.
  removeSelected: () => {
    const { selection } = get();
    if (selection.length === 0) return;
    get().pushHistory();
    const idsOfKind = (kind) => new Set(selection.filter((s) => s.kind === kind).map((s) => s.id));
    const wallIds = idsOfKind('wall');
    const furnitureIds = idsOfKind('furniture');
    const shapeIds = idsOfKind('shape');
    set((state) => ({
      walls: state.walls.filter((w) => !wallIds.has(w.id)),
      furniture: state.furniture.filter((f) => !furnitureIds.has(f.id)),
      shapes: state.shapes.filter((s) => !shapeIds.has(s.id)),
      measureIds: state.measureIds.filter((m) => !selection.some((s) => s.id === m.id && s.kind === m.kind)),
      selection: [],
      selectedId: null,
      selectedKind: null,
      dirty: true,
    }));
  },

  // Copies every element in `selection` onto the clipboard as one batch.
  copySelected: () => {
    const { selection, walls, furniture, shapes } = get();
    if (selection.length === 0) return;
    const items = selection
      .map(({ id, kind }) => {
        const list = kind === 'wall' ? walls : kind === 'furniture' ? furniture : shapes;
        const item = list.find((i) => i.id === id);
        if (!item) return null;
        const { id: _id, ...data } = item;
        return { kind, data: structuredClone(data) };
      })
      .filter(Boolean);
    if (items.length === 0) return;
    set({ clipboard: items });
  },

  // Pastes the whole clipboard batch, offset from the originals, as one
  // undo step, and selects everything just pasted.
  pasteClipboard: () => {
    const { clipboard } = get();
    if (!clipboard || clipboard.length === 0) return;
    const OFFSET = 30; // cm
    get().pushHistory();
    const newSelection = [];
    const nextClipboard = [];
    set((state) => {
      const walls = [...state.walls];
      const furniture = [...state.furniture];
      const shapes = [...state.shapes];
      for (const { kind, data } of clipboard) {
        const id = uuid();
        if (kind === 'wall') {
          const next = { ...data, x1: data.x1 + OFFSET, y1: data.y1 + OFFSET, x2: data.x2 + OFFSET, y2: data.y2 + OFFSET };
          walls.push({ ...next, id });
          nextClipboard.push({ kind, data: next });
        } else if (kind === 'furniture') {
          const next = { ...data, x: data.x + OFFSET, y: data.y + OFFSET };
          furniture.push({ ...next, id });
          nextClipboard.push({ kind, data: next });
        } else if (kind === 'shape') {
          const next = { ...data, points: data.points.map((p) => ({ x: p.x + OFFSET, y: p.y + OFFSET })) };
          shapes.push({ ...next, id });
          nextClipboard.push({ kind, data: next });
        } else {
          continue;
        }
        newSelection.push({ id, kind });
      }
      return { walls, furniture, shapes, dirty: true };
    });
    const single = newSelection.length === 1 ? newSelection[0] : null;
    set({
      clipboard: nextClipboard,
      selection: newSelection,
      selectedId: single?.id ?? null,
      selectedKind: single?.kind ?? null,
    });
  },

  // Moves every element in `selection` by the same (dx, dy), as one undo
  // step — used when dragging one item of a multi-selection: the rest of
  // the group follows along instead of being left behind.
  translateSelection: (dx, dy) => {
    const { selection } = get();
    if (selection.length === 0) return;
    get().pushHistory();
    const idsOfKind = (kind) => new Set(selection.filter((s) => s.kind === kind).map((s) => s.id));
    const wallIds = idsOfKind('wall');
    const furnitureIds = idsOfKind('furniture');
    const shapeIds = idsOfKind('shape');
    set((state) => ({
      walls: state.walls.map((w) =>
        wallIds.has(w.id) ? { ...w, x1: w.x1 + dx, y1: w.y1 + dy, x2: w.x2 + dx, y2: w.y2 + dy } : w
      ),
      furniture: state.furniture.map((f) => (furnitureIds.has(f.id) ? { ...f, x: f.x + dx, y: f.y + dy } : f)),
      shapes: state.shapes.map((s) =>
        shapeIds.has(s.id) ? { ...s, points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) } : s
      ),
      dirty: true,
    }));
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
      measureIds: [],
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
      measureIds: [],
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
