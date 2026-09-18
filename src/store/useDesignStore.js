import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

const DEFAULT_WALL_THICKNESS = 15; // cm
export const GRID_SIZE = 20; // cm

const emptyDesign = () => ({
  name: 'Neuer Entwurf',
  walls: [],
  furniture: [],
});

function snapshot(state) {
  return { walls: state.walls, furniture: state.furniture, name: state.name };
}

export const useDesignStore = create((set, get) => ({
  ...emptyDesign(),

  tool: 'select', // 'select' | 'wall' | 'delete'
  wallThickness: DEFAULT_WALL_THICKNESS,
  snapToGrid: true,
  selectedId: null,
  selectedKind: null, // 'wall' | 'furniture'
  past: [],
  future: [],
  dirty: false,

  setTool: (tool) => set({ tool, selectedId: null, selectedKind: null }),
  setWallThickness: (wallThickness) => set({ wallThickness }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setName: (name) => set({ name, dirty: true }),

  select: (id, kind) => set({ selectedId: id, selectedKind: kind }),
  clearSelection: () => set({ selectedId: null, selectedKind: null }),

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
      walls: [...state.walls, { id: uuid(), thickness: state.wallThickness, ...wall }],
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
      dirty: true,
    }));
  },

  addFurniture: (item) => {
    get().pushHistory();
    const id = uuid();
    set((state) => ({
      furniture: [...state.furniture, { id, rotation: 0, ...item }],
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

  removeSelected: () => {
    const { selectedId, selectedKind } = get();
    if (!selectedId) return;
    if (selectedKind === 'wall') get().removeWall(selectedId);
    if (selectedKind === 'furniture') get().removeFurniture(selectedId);
  },

  newDesign: () => set({ ...emptyDesign(), selectedId: null, selectedKind: null, past: [], future: [], dirty: false }),

  loadDesign: (data) => {
    set({
      name: data.name ?? 'Importierter Entwurf',
      walls: Array.isArray(data.walls) ? data.walls : [],
      furniture: Array.isArray(data.furniture) ? data.furniture : [],
      selectedId: null,
      selectedKind: null,
      past: [],
      future: [],
      dirty: false,
    });
  },

  markSaved: () => set({ dirty: false }),

  toJSON: () => {
    const state = get();
    return {
      version: 1,
      name: state.name,
      walls: state.walls,
      furniture: state.furniture,
      savedAt: new Date().toISOString(),
    };
  },
}));
