import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VztComponent } from '../types';

interface Vzt3DViewerProps {
  component: Partial<VztComponent>;
  wireframe?: boolean;
  autoRotate?: boolean;
}

export const Vzt3DViewer: React.FC<Vzt3DViewerProps> = ({
  component,
  wireframe = false,
  autoRotate = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x090d16);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(3, 2.5, 3.5);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Grid and helpers
    const grid = new THREE.GridHelper(10, 20, 0x1e293b, 0x0f172a);
    grid.position.y = -1;
    scene.add(grid);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.0);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf59e0b, 1.2);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Group for the model
    const group = new THREE.Group();
    meshGroupRef.current = group;
    scene.add(group);

    // Interaction controls
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !meshGroupRef.current) return;
      const deltaX = e.clientX - prevMouse.x;
      const deltaY = e.clientY - prevMouse.y;
      meshGroupRef.current.rotation.y += deltaX * 0.01;
      meshGroupRef.current.rotation.x += deltaY * 0.01;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(1.5, Math.min(8, camera.position.z + e.deltaY * 0.005));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate && meshGroupRef.current && !isDragging) {
        meshGroupRef.current.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
    };
    animate();

    let resizeRafId: number | null = null;
    const handleResize = () => {
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeRafId = requestAnimationFrame(() => {
        if (!mountRef.current || !rendererRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        rendererRef.current.setSize(w, h, false);
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, []);

  // Update Geometry when component parameters change
  useEffect(() => {
    if (!meshGroupRef.current) return;
    const group = meshGroupRef.current;

    // Clear old children
    while (group.children.length > 0) {
      const obj = group.children[0] as THREE.Mesh;
      if (obj.geometry) obj.geometry.dispose();
      group.remove(obj);
    }

    const type = component.type || 'Rovné';
    const medium = component.medium || 'VZT';
    const w = (component.width || 800) / 1000;
    const h = (component.height || 400) / 1000;
    const l = (component.length || 1500) / 1000;
    const diam = (component.diameter || (component.dn ? component.dn * 1.15 : 250)) / 1000;
    const offsetM = (component.offset || 300) / 1000;

    // Material color determination based on medium and material
    let mainColor = 0x94a3b8; // Default galvanized zinc
    let metalness = 0.85;
    let roughness = 0.25;

    if (component.material === 'HLINIK') {
      mainColor = 0xd1d5db;
      metalness = 0.75;
      roughness = 0.3;
    } else if (component.material === 'NEREZ') {
      mainColor = 0xe2e8f0;
      metalness = 0.95;
      roughness = 0.15;
    } else if (component.material === 'MED') {
      mainColor = 0xd97706; // Copper amber/bronze
      metalness = 0.85;
      roughness = 0.2;
    } else if (component.material === 'PPR') {
      mainColor = 0x059669; // PPR green
      metalness = 0.1;
      roughness = 0.6;
    } else if (component.material === 'PEX_AL_PEX') {
      mainColor = 0xf8fafc; // White PEX
      metalness = 0.2;
      roughness = 0.4;
    } else if (component.material === 'OCEL_BEZESVA' || component.material === 'OCEL_UHLIKOVA') {
      mainColor = 0x334155; // Dark steel
      metalness = 0.8;
      roughness = 0.4;
    }

    const metalMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      metalness,
      roughness,
      wireframe,
      side: THREE.DoubleSide,
    });

    const flangeMat = new THREE.MeshStandardMaterial({
      color: medium === 'TOPENI' ? 0xef4444 : medium === 'VODA' ? 0x0284c7 : 0x475569,
      metalness: 0.8,
      roughness: 0.3,
    });

    const valveHandleMat = new THREE.MeshStandardMaterial({
      color: medium === 'TOPENI' ? 0xdc2626 : 0x0284c7, // Red for heating, blue for water
      metalness: 0.5,
      roughness: 0.3,
    });

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.7,
      roughness: 0.4,
    });

    if (type === 'Rovné') {
      // Main rectangular body
      const geo = new THREE.BoxGeometry(w, h, l);
      const mesh = new THREE.Mesh(geo, metalMat);
      group.add(mesh);

      // Flanges on both ends
      const flange1 = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, h * 1.08, 0.04), flangeMat);
      flange1.position.z = l / 2;
      group.add(flange1);

      const flange2 = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, h * 1.08, 0.04), flangeMat);
      flange2.position.z = -l / 2;
      group.add(flange2);

      // Reinforcement cross ribs
      const rib = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, h * 1.02, 0.02), flangeMat);
      rib.position.z = 0;
      group.add(rib);
    } else if (type === 'Kruhové' || type === 'Trubka_Voda' || type === 'Trubka_Topeni') {
      // Circular pipe or Spiro duct
      const radius = diam / 2;
      const geo = new THREE.CylinderGeometry(radius, radius, l, 32);
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, metalMat);
      group.add(mesh);

      if (medium === 'VZT') {
        // Spiro spiral ridges
        for (let i = -l / 2 + 0.1; i <= l / 2 - 0.1; i += 0.15) {
          const ringGeo = new THREE.TorusGeometry(radius * 1.02, 0.008, 8, 32);
          const ring = new THREE.Mesh(ringGeo, flangeMat);
          ring.position.z = i;
          group.add(ring);
        }
      } else {
        // Water/Heating pipe fittings & insulation rings
        const pressFitting1 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.2, radius * 1.2, 0.08, 24), flangeMat);
        pressFitting1.rotateX(Math.PI / 2);
        pressFitting1.position.z = l / 2 - 0.04;
        group.add(pressFitting1);

        const pressFitting2 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.2, radius * 1.2, 0.08, 24), flangeMat);
        pressFitting2.rotateX(Math.PI / 2);
        pressFitting2.position.z = -l / 2 + 0.04;
        group.add(pressFitting2);
      }
    } else if (type === 'Koleno') {
      // 90 or 45 degree elbow
      const angle = (component.angle || 90) * (Math.PI / 180);
      const torusRadius = Math.max(w, h, diam) * 1.2;
      const tubeRadius = Math.min(w, h, diam) * 0.6;
      const geo = new THREE.TorusGeometry(torusRadius, tubeRadius, 16, 32, angle);
      const mesh = new THREE.Mesh(geo, metalMat);
      mesh.position.set(-torusRadius / 2, -torusRadius / 2, 0);
      group.add(mesh);

      // Revision access door if required
      if (component.requiresAccessDoor) {
        const doorGeo = new THREE.BoxGeometry(0.18, 0.12, 0.03);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 0, tubeRadius * 0.95);
        group.add(door);
      }
    } else if (type === 'Odsazení') {
      // S-curve offset (Změna osy / etážka)
      const r = diam / 2 || 0.15;
      const part1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l * 0.4, 24), metalMat);
      part1.rotateX(Math.PI / 2);
      part1.position.set(0, 0, -l * 0.3);
      group.add(part1);

      const part2 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Math.sqrt(Math.pow(l * 0.2, 2) + Math.pow(offsetM, 2)), 24), metalMat);
      part2.position.set(offsetM / 2, 0, 0);
      part2.rotateZ(-Math.atan2(offsetM, l * 0.2));
      part2.rotateX(Math.PI / 2);
      group.add(part2);

      const part3 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l * 0.4, 24), metalMat);
      part3.rotateX(Math.PI / 2);
      part3.position.set(offsetM, 0, l * 0.3);
      group.add(part3);
    } else if (type === 'Redukce') {
      // Transition reducer
      const w2 = ((component.width2 || 600) / 1000);
      const h2 = ((component.height2 || 300) / 1000);
      const geo = new THREE.CylinderGeometry(Math.min(w2, h2) / 2, Math.min(w, h) / 2, l, 4);
      geo.rotateX(Math.PI / 2);
      geo.rotateZ(Math.PI / 4);
      const mesh = new THREE.Mesh(geo, metalMat);
      mesh.scale.set(w / Math.min(w, h), h / Math.min(w, h), 1);
      group.add(mesh);
    } else if (type === 'Armatura_Ventil') {
      // Ball valve / regulating valve
      const bodyRadius = diam / 2 || 0.08;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius, bodyRadius, l * 0.8, 24), metalMat);
      body.rotateX(Math.PI / 2);
      group.add(body);

      // Central sphere / valve body
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(bodyRadius * 1.5, 16, 16), flangeMat);
      group.add(sphere);

      // Valve handle neck & lever
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius * 0.3, bodyRadius * 0.3, bodyRadius * 1.8, 16), flangeMat);
      stem.position.y = bodyRadius * 1.2;
      group.add(stem);

      const lever = new THREE.Mesh(new THREE.BoxGeometry(bodyRadius * 0.4, bodyRadius * 0.2, l * 0.5), valveHandleMat);
      lever.position.set(0, bodyRadius * 2.1, l * 0.15);
      group.add(lever);
    } else {
      // T-Kus or Odbočka
      const mainGeo = new THREE.BoxGeometry(w, h, l);
      const mainMesh = new THREE.Mesh(mainGeo, metalMat);
      group.add(mainMesh);

      const branchGeo = new THREE.BoxGeometry(w * 0.7, h * 0.7, l * 0.5);
      branchGeo.rotateY(Math.PI / 2);
      const branchMesh = new THREE.Mesh(branchGeo, metalMat);
      branchMesh.position.x = (w + l * 0.5) / 2;
      group.add(branchMesh);
    }

    // Access door overlay if component flag is on
    if (component.requiresAccessDoor && type !== 'Koleno') {
      const doorGeo = new THREE.BoxGeometry(w * 0.4, 0.02, l * 0.3);
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.y = h / 2 + 0.01;
      group.add(door);
    }
  }, [component, wireframe]);

  return (
    <div className="relative w-full h-full min-h-[300px] overflow-hidden rounded-xl bg-slate-900/80 border border-slate-800 shadow-inner flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      
      {/* 3D HUD Indicators */}
      <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/50 text-xs font-mono text-cyan-400 flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        <span>
          3D [{component.medium || 'VZT'}]: {component.type || 'Rovné'} {component.dn ? `DN${component.dn}` : component.width ? `${component.width}×${component.height}` : `Ø${component.diameter}`} mm
        </span>
      </div>

      <div className="absolute bottom-3 right-3 text-[11px] font-mono text-slate-400 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800">
        🖱️ Tažením otáčejte • Kolečkem zoom
      </div>
    </div>
  );
};
