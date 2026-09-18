import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useDesignStore } from '../store/useDesignStore';

const WALL_HEIGHT_CM = 250;
const CM = 1 / 100; // cm -> meters

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
    walls.forEach((w) => {
      const dx = w.x2 - w.x1;
      const dy = w.y2 - w.y1;
      const length = Math.hypot(dx, dy) * CM;
      if (length <= 0) return;
      const angle = Math.atan2(dy, dx);
      const thickness = (w.thickness || 15) * CM;
      const height = WALL_HEIGHT_CM * CM;

      const geometry = new THREE.BoxGeometry(length, height, thickness);
      const mesh = new THREE.Mesh(geometry, wallMaterial);
      const midX = ((w.x1 + w.x2) / 2) * CM;
      const midZ = ((w.y1 + w.y2) / 2) * CM;
      mesh.position.set(midX, height / 2, midZ);
      mesh.rotation.y = -angle;
      scene.add(mesh);
    });

    furniture.forEach((item) => {
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
