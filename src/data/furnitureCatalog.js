// Möbelkatalog: Standardmaße in cm. width = Breite (x), depth = Tiefe (y) im unrotierten Zustand.
// height = ungefähre Objekthöhe in cm, nur für die 3D-Vorschau relevant.
export const FURNITURE_CATALOG = [
  {
    category: 'Schlafzimmer',
    items: [
      { type: 'bed-double', label: 'Doppelbett', width: 180, depth: 200, height: 55, color: '#c9a27e' },
      { type: 'bed-single', label: 'Einzelbett', width: 90, depth: 200, height: 55, color: '#c9a27e' },
      { type: 'wardrobe', label: 'Kleiderschrank', width: 120, depth: 60, height: 200, color: '#a98467' },
      { type: 'nightstand', label: 'Nachttisch', width: 40, depth: 40, height: 55, color: '#c9a27e' },
    ],
  },
  {
    category: 'Wohnzimmer',
    items: [
      { type: 'sofa', label: 'Sofa', width: 200, depth: 90, height: 80, color: '#6b8f71' },
      { type: 'armchair', label: 'Sessel', width: 85, depth: 85, height: 80, color: '#6b8f71' },
      { type: 'coffee-table', label: 'Couchtisch', width: 110, depth: 60, height: 40, color: '#8a6d4c' },
      { type: 'tv', label: 'TV', width: 120, depth: 15, height: 70, color: '#2b2d3a' },
      { type: 'bookshelf', label: 'Regal', width: 90, depth: 30, height: 200, color: '#a98467' },
    ],
  },
  {
    category: 'Esszimmer / Küche',
    items: [
      { type: 'dining-table', label: 'Esstisch', width: 140, depth: 90, height: 75, color: '#8a6d4c' },
      { type: 'chair', label: 'Stuhl', width: 45, depth: 45, height: 90, color: '#4a6fa5' },
      { type: 'kitchen-counter', label: 'Küchenzeile', width: 200, depth: 60, height: 90, color: '#9aa5b1' },
      { type: 'fridge', label: 'Kühlschrank', width: 70, depth: 70, height: 180, color: '#c8ccd1' },
      { type: 'stove', label: 'Herd', width: 60, depth: 60, height: 90, color: '#7d7f85' },
      { type: 'sink', label: 'Spüle', width: 60, depth: 60, height: 90, color: '#9aa5b1' },
    ],
  },
  {
    category: 'Bad',
    items: [
      { type: 'bathtub', label: 'Badewanne', width: 170, depth: 75, height: 55, color: '#cfe3ea' },
      { type: 'shower', label: 'Dusche', width: 90, depth: 90, height: 200, color: '#cfe3ea' },
      { type: 'toilet', label: 'Toilette', width: 40, depth: 60, height: 40, color: '#e8edf1' },
      { type: 'washbasin', label: 'Waschbecken', width: 55, depth: 45, height: 85, color: '#e8edf1' },
    ],
  },
  {
    category: 'Arbeitszimmer',
    items: [
      { type: 'desk', label: 'Schreibtisch', width: 120, depth: 60, height: 75, color: '#8a6d4c' },
      { type: 'office-chair', label: 'Bürostuhl', width: 50, depth: 50, height: 95, color: '#4a6fa5' },
    ],
  },
  {
    category: 'Bauteile',
    items: [
      { type: 'door', label: 'Tür', width: 90, depth: 10, height: 205, color: '#e0a458' },
      { type: 'window', label: 'Fenster', width: 120, depth: 10, height: 120, color: '#8ecae6' },
    ],
  },
  {
    category: 'Garten & Außenbereich',
    items: [
      { type: 'tree', label: 'Baum', width: 400, depth: 400, height: 500, color: '#5b8a4f', shape: 'circle' },
      { type: 'shrub', label: 'Strauch', width: 100, depth: 100, height: 90, color: '#6f9c5c', shape: 'circle' },
      { type: 'hedge', label: 'Hecke (Element)', width: 100, depth: 40, height: 100, color: '#5a7d4a' },
      { type: 'lawn', label: 'Rasenfläche', width: 400, depth: 400, height: 1, color: '#8fbf6e' },
      { type: 'terrace', label: 'Terrasse', width: 300, depth: 250, height: 3, color: '#c9b79c' },
      { type: 'garden-path', label: 'Gartenweg (Element)', width: 100, depth: 60, height: 2, color: '#c7c2b8' },
      { type: 'pool', label: 'Pool', width: 400, depth: 200, height: 20, color: '#5fb3d9' },
      { type: 'garden-shed', label: 'Gartenhaus', width: 200, depth: 150, height: 220, color: '#a5793f' },
      { type: 'garage', label: 'Garage', width: 300, depth: 550, height: 250, color: '#9aa5b1' },
      { type: 'garden-seating', label: 'Sitzgruppe', width: 150, depth: 150, height: 45, color: '#8a6d4c' },
      { type: 'grill', label: 'Grill', width: 60, depth: 60, height: 100, color: '#3d3d3d' },
      { type: 'fence', label: 'Zaunelement', width: 180, depth: 8, height: 120, color: '#8a6d4c' },
    ],
  },
  {
    category: 'Bereiche / Markierungen',
    items: [
      { type: 'zone-generic', label: 'Bereich (frei)', width: 300, depth: 300, height: 1, color: '#f4a300', shape: 'zone', opacity: 0.4 },
      { type: 'zone-parking', label: 'Parkplatz', width: 500, depth: 250, height: 1, color: '#4a6fa5', shape: 'zone', opacity: 0.4 },
      { type: 'zone-play', label: 'Spielbereich', width: 500, depth: 500, height: 1, color: '#e07a5f', shape: 'zone', opacity: 0.4 },
    ],
  },
];

export const FURNITURE_BY_TYPE = Object.fromEntries(
  FURNITURE_CATALOG.flatMap((group) => group.items).map((item) => [item.type, item])
);

// Freeform presets: unlike furniture (fixed rect with width/depth/rotation),
// these become editable polygons (`shapes` in the store) — they start as a
// plain rectangle but every corner can be dragged independently afterwards.
export const SHAPE_PRESETS = [
  { type: 'freeform-garage', label: 'Garage (frei formbar)', width: 300, depth: 550, height: 250, color: '#9aa5b1' },
  { type: 'freeform-building', label: 'Gebäude (frei formbar)', width: 400, depth: 400, height: 250, color: '#b5a68c' },
  { type: 'freeform-area', label: 'Fläche (frei formbar)', width: 300, depth: 300, height: 1, color: '#f4a300' },
];

export function rectPoints(cx, cy, width, depth) {
  return [
    { x: cx - width / 2, y: cy - depth / 2 },
    { x: cx + width / 2, y: cy - depth / 2 },
    { x: cx + width / 2, y: cy + depth / 2 },
    { x: cx - width / 2, y: cy + depth / 2 },
  ];
}
