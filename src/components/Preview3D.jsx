import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useDesignStore } from '../store/useDesignStore';

const WALL_HEIGHT_CM = 250;
const WINDOW_SILL_CM = 90; // typical sill height above the floor
const CM = 1 / 100; // cm -> meters

// A door/window is just a freestanding furniture item in the 2D data (no
// real wall-opening concept), so for the 3D view we detect which wall it
// sits on (close to the wall's line, overlapping its span) and cut an
// actual opening into that wall instead of drawing a box that gets buried
// inside the solid wall geometry.
function wallFrame(wall) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;
  return { ux: dx / len, uy: dy / len, len };
}

function projectOntoWall(wall, frame, point) {
  const px = point.x - wall.x1;
  const py = point.y - wall.y1;
  const t = px * frame.ux + py * frame.uy;
  const perp = Math.abs(px * frame.uy - py * frame.ux);
  return { t, perp };
}

function mergeRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  return merged;
}

// Adds one wall-aligned box spanning [tStart, tEnd] along the wall and
// [yBottom, yTop] in height, all in cm; converts to meters internally.
function addWallBox(scene, wall, frame, tStart, tEnd, yBottom, yTop, thicknessCm, material) {
  const lengthCm = tEnd - tStart;
  const heightCm = yTop - yBottom;
  if (lengthCm <= 0.5 || heightCm <= 0.5) return;
  const centerT = (tStart + tEnd) / 2;
  const cx = wall.x1 + frame.ux * centerT;
  const cy = wall.y1 + frame.uy * centerT;
  const angle = Math.atan2(frame.uy, frame.ux);

  const geometry = new THREE.BoxGeometry(lengthCm * CM, heightCm * CM, thicknessCm * CM);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(cx * CM, (yBottom + heightCm / 2) * CM, cy * CM);
  mesh.rotation.y = -angle;
  scene.add(mesh);
}

export default function Preview3D({ onClose }) {
  const containerRef = useRef(null);
  const walls = useDesignStore((s) => s.walls);
  const furniture = useDesignStore((s) => s.furniture);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#dfe6ee');

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(8, 12, 6);
    scene.add(ambient, sun);

    // bounding box of the whole design, to size the floor and place the camera
    const bounds = { minX: 0, maxX: 500, minY: 0, maxY: 400 };
    let hasContent = false;
    const extend = (x, y) => {
      hasContent = true;
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y);
    };
    walls.forEach((w) => {
      extend(w.x1, w.y1);
      extend(w.x2, w.y2);
    });
    furniture.forEach((f) => {
      extend(f.x - f.width, f.y - f.depth);
      extend(f.x + f.width, f.y + f.depth);
    });
    if (!hasContent) {
      bounds.minX = 0; bounds.maxX = 500; bounds.minY = 0; bounds.maxY = 400;
    }

    const floorW = Math.max(4, (bounds.maxX - bounds.minX) * CM + 2);
    const floorD = Math.max(4, (bounds.maxY - bounds.minY) * CM + 2);
    const centerX = ((bounds.minX + bounds.maxX) / 2) * CM;
    const centerZ = ((bounds.minY + bounds.maxY) / 2) * CM;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({ color: '#f2ede4' })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(centerX, 0, centerZ);
    scene.add(floor);

    const grid = new THREE.GridHelper(Math.max(floorW, floorD), Math.round(Math.max(floorW, floorD)), '#c9c9c9', '#dddddd');
    grid.position.set(centerX, 0.001, centerZ);
    scene.add(grid);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: '#8f95a3' });
    const doorMaterial = new THREE.MeshStandardMaterial({ color: '#8a5a2b' });
    const windowGlassMaterial = new THREE.MeshStandardMaterial({
      color: '#a9d6e5',
      transparent: true,
      opacity: 0.45,
    });

    const openable = furniture.filter((f) => f.type === 'door' || f.type === 'window');
    const assignedIds = new Set();

    walls.forEach((w) => {
      const frame = wallFrame(w);
      if (!frame) return;
      const thickness = w.thickness || 15;

      // Which doors/windows sit on this wall: close to its line and
      // overlapping its span (in the wall's own cm coordinates).
      const openings = [];
      openable.forEach((item) => {
        const { t, perp } = projectOntoWall(w, frame, { x: item.x, y: item.y });
        if (perp > thickness / 2 + 25) return;
        const halfWidth = item.width / 2;
        const start = t - halfWidth;
        const end = t + halfWidth;
        if (end <= 0 || start >= frame.len) return;
        assignedIds.add(item.id);
        openings.push({ item, start: Math.max(start, 0), end: Math.min(end, frame.len) });
      });

      // Solid wall fill = the wall's span minus the union of all openings.
      const covered = mergeRanges(openings.map((o) => ({ start: o.start, end: o.end })));
      let cursor = 0;
      covered.forEach((range) => {
        addWallBox(scene, w, frame, cursor, range.start, 0, WALL_HEIGHT_CM, thickness, wallMaterial);
        cursor = range.end;
      });
      addWallBox(scene, w, frame, cursor, frame.len, 0, WALL_HEIGHT_CM, thickness, wallMaterial);

      // Per opening: header (and sill, for windows) plus a visible leaf/pane.
      openings.forEach(({ item, start, end }) => {
        if (item.type === 'door') {
          const doorHeight = Math.min(item.height || 205, WALL_HEIGHT_CM);
          addWallBox(scene, w, frame, start, end, doorHeight, WALL_HEIGHT_CM, thickness, wallMaterial);
          addWallBox(scene, w, frame, start, end, 0, doorHeight, thickness * 0.6, doorMaterial);
        } else {
          const sill = Math.min(WINDOW_SILL_CM, WALL_HEIGHT_CM);
          const top = Math.min(sill + (item.height || 120), WALL_HEIGHT_CM);
          addWallBox(scene, w, frame, start, end, 0, sill, thickness, wallMaterial);
          addWallBox(scene, w, frame, start, end, top, WALL_HEIGHT_CM, thickness, wallMaterial);
          addWallBox(scene, w, frame, start, end, sill, top, thickness * 0.3, windowGlassMaterial);
        }
      });
    });

    // Doors/windows that aren't placed on any wall (or all other furniture)
    // still get drawn as plain boxes so nothing silently disappears.
    furniture
      .filter((item) => !assignedIds.has(item.id))
      .forEach((item) => {
        const width = item.width * CM;
        const depth = item.depth * CM;
        const height = (item.height || 60) * CM;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: item.color || '#8899aa' });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(item.x * CM, height / 2, item.y * CM);
        mesh.rotation.y = -((item.rotation || 0) * Math.PI) / 180;
        scene.add(mesh);
      });

    const radius = Math.max(floorW, floorD);
    camera.position.set(centerX + radius * 0.7, radius * 0.8, centerZ + radius * 0.7);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(centerX, 0.5, centerZ);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.update();

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let raf;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [walls, furniture]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>3D-Vorschau</h2>
          <button type="button" onClick={onClose}>✕ Schließen</button>
        </div>
        <div ref={containerRef} className="preview3d-canvas" />
        <p className="preview3d-hint">Ziehen zum Drehen · Scrollen zum Zoomen · Rechtsklick-Ziehen zum Verschieben</p>
      </div>
    </div>
  );
}
