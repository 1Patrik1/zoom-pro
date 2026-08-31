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
    const height = container.clientHeight || 320;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0f1d);

    // Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(2.8, 2.2, 3.2);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Grid and base plate
    const grid = new THREE.GridHelper(10, 20, 0x1e293b, 0x0f172a);
    grid.position.y = -0.8;
    scene.add(grid);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.2);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf59e0b, 1.3);
    dirLight2.position.set(-6, -4, -6);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 1.0, 10);
    pointLight.position.set(0, 4, 2);
    scene.add(pointLight);

    // Group for the model
    const group = new THREE.Group();
    meshGroupRef.current = group;
    scene.add(group);

    // Interactive mouse / touch controls
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
      camera.position.z = Math.max(1.2, Math.min(9, camera.position.z + e.deltaY * 0.005));
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
        meshGroupRef.current.rotation.y += 0.004;
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
    const shape = component.shape || (type === 'Kruhové' ? 'KULATE' : 'HRANATE');
    const isRound = shape === 'KULATE' || type === 'Kruhové' || type === 'Trubka_Voda' || type === 'Trubka_Topeni';

    // Normalized dimensions in meters for 3D stage
    const w = (component.width || 800) / 1000;
    const h = (component.height || 400) / 1000;
    const l = Math.min(3.5, (component.length || 1500) / 1000);
    const diam = (component.diameter || (component.dn ? component.dn * 1.15 : 250)) / 1000;
    const diam2 = (component.diameter2 || 200) / 1000;
    const w2 = (component.width2 || 600) / 1000;
    const h2 = (component.height2 || 300) / 1000;
    const angleDeg = component.angle || 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const radiusM = (component.radius || (isRound ? (diam * 1.0 * 1000) : (Math.max(w, h) * 0.8 * 1000))) / 1000;
    const offsetM = (component.offset || 250) / 1000;

    // Material colors
    let mainColor = 0x94a3b8; // Default galvanized zinc (Pozink)
    let metalness = 0.88;
    let roughness = 0.22;

    if (component.material === 'HLINIK') {
      mainColor = 0xd4d4d8;
      metalness = 0.75;
      roughness = 0.32;
    } else if (component.material === 'NEREZ') {
      mainColor = 0xe2e8f0;
      metalness = 0.96;
      roughness = 0.12;
    } else if (component.material === 'MED') {
      mainColor = 0xd97706; // Copper
      metalness = 0.85;
      roughness = 0.2;
    } else if (component.material === 'PPR') {
      mainColor = 0x059669; // PPR green
      metalness = 0.1;
      roughness = 0.6;
    } else if (component.material === 'PEX_AL_PEX') {
      mainColor = 0xf8fafc; // White PEX
      metalness = 0.15;
      roughness = 0.45;
    } else if (component.material === 'OCEL_BEZESVA' || component.material === 'OCEL_UHLIKOVA') {
      mainColor = 0x334155; // Dark steel
      metalness = 0.82;
      roughness = 0.38;
    }

    const metalMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      metalness,
      roughness,
      wireframe,
      side: THREE.DoubleSide,
    });

    const flangeColor = medium === 'TOPENI' ? 0xdc2626 : medium === 'VODA' ? 0x0284c7 : 0x334155;
    const flangeMat = new THREE.MeshStandardMaterial({
      color: flangeColor,
      metalness: 0.85,
      roughness: 0.28,
    });

    const rubberSealMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // EPDM Black rubber
      roughness: 0.9,
      metalness: 0.1,
    });

    const doorMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber / yellow inspection door
      metalness: 0.7,
      roughness: 0.35,
    });

    const actuatorMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Belimo red / orange actuator
      metalness: 0.4,
      roughness: 0.4,
    });

    const acousticMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Mineral wool
      roughness: 0.95,
      metalness: 0.05,
    });

    // Helper: Add Rectangular Flange
    const addRectFlange = (widthM: number, heightM: number, posZ: number, rotY: number = 0, posX: number = 0) => {
      const flangeThick = 0.035;
      const flangeBorder = 0.04;
      const flangeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(widthM + flangeBorder * 2, heightM + flangeBorder * 2, flangeThick),
        flangeMat
      );
      flangeMesh.position.set(posX, 0, posZ);
      flangeMesh.rotation.y = rotY;
      group.add(flangeMesh);

      // Corner rosettes / rohovníky
      const cornerSize = 0.03;
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(cornerSize, cornerSize, flangeThick * 1.1), doorMat);
      c1.position.set(posX + widthM / 2, heightM / 2, posZ);
      c1.rotation.y = rotY;
      group.add(c1);
    };

    // Helper: Add Circular Spiro Collar with EPDM rubber ring
    const addCircularCollar = (diameterM: number, posZ: number, rotX: number = Math.PI / 2, posX: number = 0) => {
      const r = diameterM / 2;
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.06, 32), flangeMat);
      collar.rotation.x = rotX;
      collar.position.set(posX, 0, posZ);
      group.add(collar);

      // EPDM rubber gasket
      const gasket = new THREE.Mesh(new THREE.TorusGeometry(r * 1.025, 0.006, 8, 32), rubberSealMat);
      gasket.position.set(posX, 0, posZ);
      group.add(gasket);
    };

    // ==========================================
    // 1. ROVNÉ POTRUBÍ (STRAIGHT DUCT)
    // ==========================================
    if (type === 'Rovné' || type === 'Trubka_Voda' || type === 'Trubka_Topeni') {
      if (isRound) {
        // ROUND / SPIRO STRAIGHT DUCT
        const radius = diam / 2;
        const geo = new THREE.CylinderGeometry(radius, radius, l, 36);
        geo.rotateX(Math.PI / 2);
        const mesh = new THREE.Mesh(geo, metalMat);
        group.add(mesh);

        if (medium === 'VZT') {
          // Continuous Spiro Spiral Lockseam Grooves
          for (let i = -l / 2 + 0.12; i <= l / 2 - 0.12; i += 0.14) {
            const ringGeo = new THREE.TorusGeometry(radius * 1.018, 0.006, 8, 32);
            const ring = new THREE.Mesh(ringGeo, flangeMat);
            ring.position.z = i;
            group.add(ring);
          }
          addCircularCollar(diam, l / 2);
          addCircularCollar(diam, -l / 2);
        } else {
          // Water/Heating press fittings
          addCircularCollar(diam, l / 2 - 0.03);
          addCircularCollar(diam, -l / 2 + 0.03);
        }
      } else {
        // RECTANGULAR STRAIGHT DUCT (4-HRANNÉ)
        const geo = new THREE.BoxGeometry(w, h, l);
        const mesh = new THREE.Mesh(geo, metalMat);
        group.add(mesh);

        // Flanges P20/P30 on both ends
        addRectFlange(w, h, l / 2);
        addRectFlange(w, h, -l / 2);

        // Stiffening cross ribs (X-prolisy proti vibracím)
        if (l >= 0.8) {
          const ribCount = Math.max(1, Math.floor(l / 0.6));
          for (let i = 1; i <= ribCount; i++) {
            const ribZ = -l / 2 + (l / (ribCount + 1)) * i;
            const ribMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 1.015, h * 1.015, 0.015), flangeMat);
            ribMesh.position.z = ribZ;
            group.add(ribMesh);
          }
        }
      }
    }

    // ==========================================
    // 2. KOLENO (ELBOW / BEND) - HRANATÉ & KULATÉ
    // ==========================================
    else if (type === 'Koleno') {
      if (isRound) {
        // --- KULATÉ / SPIRO KOLENO (ROUND ELBOW) ---
        const tubeRadius = diam / 2;
        const bendRadius = Math.max(tubeRadius * 1.1, radiusM);

        // Build curved torus segment for round elbow
        const torusGeo = new THREE.TorusGeometry(bendRadius, tubeRadius, 24, 36, angleRad);
        const mesh = new THREE.Mesh(torusGeo, metalMat);
        // Center the bend nicely in viewport
        mesh.rotation.z = Math.PI / 2;
        mesh.position.set(-bendRadius * 0.5, -bendRadius * 0.5, 0);
        group.add(mesh);

        // Segment lock rings for segmented spiro elbows
        const segments = angleDeg === 90 ? 4 : angleDeg >= 45 ? 3 : 2;
        for (let s = 1; s < segments; s++) {
          const segAngle = (angleRad / segments) * s;
          const sx = -bendRadius * 0.5 + bendRadius * Math.sin(segAngle);
          const sy = -bendRadius * 0.5 + bendRadius * (1 - Math.cos(segAngle));
          const ringGeo = new THREE.TorusGeometry(tubeRadius * 1.025, 0.007, 8, 24);
          const ring = new THREE.Mesh(ringGeo, flangeMat);
          ring.position.set(sx, sy, 0);
          ring.rotation.z = -segAngle;
          group.add(ring);
        }

        // Inlet and Outlet male collars with EPDM rubber
        const inCollar = new THREE.Mesh(new THREE.CylinderGeometry(tubeRadius * 1.02, tubeRadius * 1.02, 0.08, 24), flangeMat);
        inCollar.position.set(-bendRadius * 0.5, -bendRadius * 0.5, 0);
        group.add(inCollar);

        const outX = -bendRadius * 0.5 + bendRadius * Math.sin(angleRad);
        const outY = -bendRadius * 0.5 + bendRadius * (1 - Math.cos(angleRad));
        const outCollar = new THREE.Mesh(new THREE.CylinderGeometry(tubeRadius * 1.02, tubeRadius * 1.02, 0.08, 24), flangeMat);
        outCollar.position.set(outX, outY, 0);
        outCollar.rotation.z = -angleRad;
        group.add(outCollar);

        // Inspection access door on round elbow
        if (component.requiresAccessDoor) {
          const doorGeo = new THREE.CylinderGeometry(tubeRadius * 0.6, tubeRadius * 0.6, 0.03, 16);
          const door = new THREE.Mesh(doorGeo, doorMat);
          door.position.set(-bendRadius * 0.5 + bendRadius * Math.sin(angleRad * 0.5), -bendRadius * 0.5 + bendRadius * (1 - Math.cos(angleRad * 0.5)), tubeRadius * 0.95);
          door.rotation.x = Math.PI / 2;
          group.add(door);
        }
      } else {
        // --- HRANATÉ KOLENO (RECTANGULAR ELBOW) ---
        // Top and bottom cheek plates (bočnice) + curved throat (břicho) + curved heel (hřbet)
        const bendRadius = Math.max(w * 0.6, radiusM);
        const rIn = Math.max(0.06, bendRadius - w / 2);
        const rOut = bendRadius + w / 2;
        const segCount = 20;

        // Create 3D Extruded cheek & throat body
        const shapePath = new THREE.Shape();
        shapePath.absarc(0, 0, rOut, 0, angleRad, false);
        shapePath.absarc(0, 0, rIn, angleRad, 0, true);
        shapePath.closePath();

        const extrudeSettings: THREE.ExtrudeGeometryOptions = {
          depth: h,
          bevelEnabled: false,
          curveSegments: segCount,
        };

        const rectBendGeo = new THREE.ExtrudeGeometry(shapePath, extrudeSettings);
        // Center vertically so height is balanced around Y=0
        rectBendGeo.translate(-bendRadius * 0.6, -bendRadius * 0.6, -h / 2);
        const rectBendMesh = new THREE.Mesh(rectBendGeo, metalMat);
        group.add(rectBendMesh);

        // Rectangular Flange 1 (Inlet at angle 0°)
        const inFlange = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, h * 1.1, 0.035), flangeMat);
        inFlange.position.set(-bendRadius * 0.6 + bendRadius, -bendRadius * 0.6, 0);
        inFlange.rotation.y = Math.PI / 2;
        group.add(inFlange);

        // Rectangular Flange 2 (Outlet at angle α)
        const outCenterX = -bendRadius * 0.6 + bendRadius * Math.cos(angleRad);
        const outCenterY = -bendRadius * 0.6 + bendRadius * Math.sin(angleRad);
        const outFlange = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, h * 1.1, 0.035), flangeMat);
        outFlange.position.set(outCenterX, outCenterY, 0);
        outFlange.rotation.z = angleRad;
        outFlange.rotation.y = Math.PI / 2;
        group.add(outFlange);

        // Internal Guide Vanes (Vodící lopatky pro snížení turbulence a tlakové ztráty)
        if (w >= 0.5 || angleDeg === 90) {
          const vaneRadius = (rIn + rOut) / 2;
          const vanePath = new THREE.Shape();
          vanePath.absarc(0, 0, vaneRadius + 0.005, 0.1, angleRad - 0.1, false);
          vanePath.absarc(0, 0, vaneRadius - 0.005, angleRad - 0.1, 0.1, true);
          vanePath.closePath();
          const vaneGeo = new THREE.ExtrudeGeometry(vanePath, { depth: h * 0.95, bevelEnabled: false, curveSegments: 16 });
          vaneGeo.translate(-bendRadius * 0.6, -bendRadius * 0.6, -h * 0.475);
          const vaneMesh = new THREE.Mesh(vaneGeo, flangeMat);
          group.add(vaneMesh);
        }

        // Rectangular Inspection Access Door (Revizní dvířka)
        if (component.requiresAccessDoor) {
          const doorGeo = new THREE.BoxGeometry(w * 0.5, 0.025, h * 0.6);
          const door = new THREE.Mesh(doorGeo, doorMat);
          const midAng = angleRad * 0.5;
          door.position.set(
            -bendRadius * 0.6 + (rOut + 0.01) * Math.cos(midAng),
            -bendRadius * 0.6 + (rOut + 0.01) * Math.sin(midAng),
            0
          );
          door.rotation.z = midAng + Math.PI / 2;
          group.add(door);
        }
      }
    }

    // ==========================================
    // 3. REDUKCE (TRANSITION / REDUCER)
    // ==========================================
    else if (type === 'Redukce') {
      if (shape === 'PRECHOD') {
        // PŘECHODKA 4HRANNÉ NA KRUHOVÉ (RECTANGULAR TO ROUND)
        // Transition loft from Box (w x h) at z=-l/2 to Circle (diam) at z=l/2
        const geo = new THREE.CylinderGeometry(diam / 2, Math.min(w, h) / 2, l, 32);
        geo.rotateX(Math.PI / 2);
        const mesh = new THREE.Mesh(geo, metalMat);
        mesh.scale.set(w / Math.min(w, h), h / Math.min(w, h), 1);
        group.add(mesh);

        // Rectangular flange at base
        addRectFlange(w, h, -l / 2);
        // Circular spiro collar at top
        addCircularCollar(diam, l / 2);
      } else if (isRound) {
        // KULATÁ REDUKCE SPIRO (ØD1 -> ØD2)
        const r1 = diam / 2;
        const r2 = diam2 / 2;
        const geo = new THREE.CylinderGeometry(r2, r1, l, 32);
        geo.rotateX(Math.PI / 2);
        const mesh = new THREE.Mesh(geo, metalMat);
        group.add(mesh);

        addCircularCollar(diam, -l / 2);
        addCircularCollar(diam2, l / 2);
      } else {
        // 4HRANNÁ REDUKCE (A1xB1 -> A2xB2)
        // Custom tapered prism box
        const geo = new THREE.CylinderGeometry(Math.min(w2, h2) / 2, Math.min(w, h) / 2, l, 4);
        geo.rotateX(Math.PI / 2);
        geo.rotateZ(Math.PI / 4);
        const mesh = new THREE.Mesh(geo, metalMat);
        mesh.scale.set(w / Math.min(w, h), h / Math.min(w, h), 1);
        group.add(mesh);

        addRectFlange(w, h, -l / 2);
        addRectFlange(w2, h2, l / 2);
      }
    }

    // ==========================================
    // 4. ODSAZENÍ / ETÁŽKA (OFFSET / S-CURVE)
    // ==========================================
    else if (type === 'Odsazení') {
      if (isRound) {
        // ROUND SPIRO OFFSET
        const r = diam / 2;
        const part1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l * 0.35, 24), metalMat);
        part1.rotateX(Math.PI / 2);
        part1.position.set(0, 0, -l * 0.32);
        group.add(part1);

        const hypL = Math.sqrt(Math.pow(l * 0.3, 2) + Math.pow(offsetM, 2));
        const part2 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hypL, 24), metalMat);
        part2.position.set(offsetM / 2, 0, 0);
        part2.rotateZ(-Math.atan2(offsetM, l * 0.3));
        part2.rotateX(Math.PI / 2);
        group.add(part2);

        const part3 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l * 0.35, 24), metalMat);
        part3.rotateX(Math.PI / 2);
        part3.position.set(offsetM, 0, l * 0.32);
        group.add(part3);

        addCircularCollar(diam, -l * 0.5);
        addCircularCollar(diam, l * 0.5, Math.PI / 2, offsetM);
      } else {
        // RECTANGULAR OFFSET (4HRANNÁ ETÁŽKA)
        const part1 = new THREE.Mesh(new THREE.BoxGeometry(w, h, l * 0.35), metalMat);
        part1.position.set(0, 0, -l * 0.32);
        group.add(part1);

        const hypL = Math.sqrt(Math.pow(l * 0.3, 2) + Math.pow(offsetM, 2));
        const part2 = new THREE.Mesh(new THREE.BoxGeometry(w, h, hypL), metalMat);
        part2.position.set(offsetM / 2, 0, 0);
        part2.rotation.y = -Math.atan2(offsetM, l * 0.3);
        group.add(part2);

        const part3 = new THREE.Mesh(new THREE.BoxGeometry(w, h, l * 0.35), metalMat);
        part3.position.set(offsetM, 0, l * 0.32);
        group.add(part3);

        addRectFlange(w, h, -l * 0.5);
        addRectFlange(w, h, l * 0.5, 0, offsetM);
      }
    }

    // ==========================================
    // 5. T-KUS / ODBOČKA (TEE / BRANCH)
    // ==========================================
    else if (type === 'T-Kus' || type === 'Odbočka') {
      if (isRound) {
        // ROUND / SPIRO TEE
        const mainR = diam / 2;
        const branchR = (component.branchDiameter ? component.branchDiameter / 1000 : diam * 0.8) / 2;
        const mainMesh = new THREE.Mesh(new THREE.CylinderGeometry(mainR, mainR, l, 32), metalMat);
        mainMesh.rotateX(Math.PI / 2);
        group.add(mainMesh);

        const branchMesh = new THREE.Mesh(new THREE.CylinderGeometry(branchR, branchR, l * 0.5, 24), metalMat);
        branchMesh.rotateZ(Math.PI / 2);
        branchMesh.position.x = (mainR + l * 0.25) * 0.9;
        group.add(branchMesh);

        addCircularCollar(diam, -l / 2);
        addCircularCollar(diam, l / 2);
        addCircularCollar(branchR * 2, 0, 0, (mainR + l * 0.25) * 0.9 + l * 0.25);
      } else {
        // RECTANGULAR TEE (4HRANNÝ T-KUS)
        const mainMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), metalMat);
        group.add(mainMesh);

        const brW = (component.branchWidth ? component.branchWidth / 1000 : w * 0.75);
        const brH = (component.branchHeight ? component.branchHeight / 1000 : h);
        const branchMesh = new THREE.Mesh(new THREE.BoxGeometry(l * 0.45, brH, brW), metalMat);
        branchMesh.position.x = (w + l * 0.45) / 2;
        group.add(branchMesh);

        addRectFlange(w, h, -l / 2);
        addRectFlange(w, h, l / 2);
        addRectFlange(brW, brH, 0, Math.PI / 2, (w + l * 0.45) / 2 + (l * 0.45) / 2);
      }
    }

    // ==========================================
    // 6. KLAPKA (DAMPER / SHUTTER)
    // ==========================================
    else if (type === 'Klapka') {
      if (isRound) {
        const r = diam / 2;
        const casing = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l * 0.6, 32), metalMat);
        casing.rotateX(Math.PI / 2);
        group.add(casing);

        // Internal damper disc
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.015, 24), flangeMat);
        disc.rotation.x = Math.PI / 4; // Partially open 45°
        group.add(disc);

        // Actuator
        const actuator = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.08), actuatorMat);
        actuator.position.set(0, r + 0.08, 0);
        group.add(actuator);

        addCircularCollar(diam, -l * 0.3);
        addCircularCollar(diam, l * 0.3);
      } else {
        const casing = new THREE.Mesh(new THREE.BoxGeometry(w, h, l * 0.5), metalMat);
        group.add(casing);

        // Louver blades
        const bladeCount = 3;
        for (let b = 0; b < bladeCount; b++) {
          const bladeY = -h / 2 + (h / (bladeCount + 1)) * (b + 1);
          const blade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.01, 0.12), flangeMat);
          blade.position.set(0, bladeY, 0);
          blade.rotation.x = Math.PI / 5;
          group.add(blade);
        }

        // Belimo actuator
        const actuator = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.1), actuatorMat);
        actuator.position.set(w / 2 + 0.08, 0, 0);
        group.add(actuator);

        addRectFlange(w, h, -l * 0.25);
        addRectFlange(w, h, l * 0.25);
      }
    }

    // ==========================================
    // 7. TLUMIČ HLUKU (SILENCER / ATTENUATOR)
    // ==========================================
    else if (type === 'Tlumic_Hluku') {
      if (isRound) {
        // Outer canister (larger) + Inner perforated core
        const rIn = diam / 2;
        const rOut = rIn + 0.1; // 100mm mineral wool
        const outerCanister = new THREE.Mesh(new THREE.CylinderGeometry(rOut, rOut, l, 32), metalMat);
        outerCanister.rotateX(Math.PI / 2);
        group.add(outerCanister);

        addCircularCollar(diam, -l / 2);
        addCircularCollar(diam, l / 2);
      } else {
        const outerBox = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), metalMat);
        group.add(outerBox);

        // Acoustic sound absorber baffles (kulisy) inside
        const baffleCount = 2;
        for (let bf = 0; bf < baffleCount; bf++) {
          const bfX = -w / 2 + (w / (baffleCount + 1)) * (bf + 1);
          const baffle = new THREE.Mesh(new THREE.BoxGeometry(w * 0.2, h * 0.92, l * 0.85), acousticMat);
          baffle.position.set(bfX, 0, 0);
          group.add(baffle);
        }

        addRectFlange(w, h, -l / 2);
        addRectFlange(w, h, l / 2);
      }
    }

    // ==========================================
    // 8. ZÁSLEPKA / VÍKO (END CAP)
    // ==========================================
    else if (type === 'Zaslepka') {
      if (isRound) {
        const r = diam / 2;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, 0.08, 32), metalMat);
        cap.rotateX(Math.PI / 2);
        group.add(cap);
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 16), flangeMat);
        handle.position.set(0, 0, 0.05);
        group.add(handle);
      } else {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 1.08, h * 1.08, 0.04), metalMat);
        group.add(cap);
        addRectFlange(w, h, 0);
      }
    }

    // ==========================================
    // 9. ARMATURA & VENTIL (TOPENÍ / VODA)
    // ==========================================
    else if (type === 'Armatura_Ventil') {
      const bodyRadius = diam / 2 || 0.08;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius, bodyRadius, l * 0.8, 24), metalMat);
      body.rotateX(Math.PI / 2);
      group.add(body);

      const sphere = new THREE.Mesh(new THREE.SphereGeometry(bodyRadius * 1.5, 16, 16), flangeMat);
      group.add(sphere);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(bodyRadius * 0.3, bodyRadius * 0.3, bodyRadius * 1.8, 16), flangeMat);
      stem.position.y = bodyRadius * 1.2;
      group.add(stem);

      const valveHandleMat = new THREE.MeshStandardMaterial({
        color: medium === 'TOPENI' ? 0xdc2626 : 0x0284c7,
        metalness: 0.5,
        roughness: 0.3,
      });

      const lever = new THREE.Mesh(new THREE.BoxGeometry(bodyRadius * 0.4, bodyRadius * 0.2, l * 0.5), valveHandleMat);
      lever.position.set(0, bodyRadius * 2.1, l * 0.15);
      group.add(lever);
    }

    // Access door overlay if component flag is on and not handled specifically
    if (component.requiresAccessDoor && type !== 'Koleno') {
      if (isRound) {
        const door = new THREE.Mesh(new THREE.CylinderGeometry(diam * 0.25, diam * 0.25, 0.03, 16), doorMat);
        door.position.set(0, diam / 2 + 0.01, 0);
        group.add(door);
      } else {
        const doorGeo = new THREE.BoxGeometry(w * 0.4, 0.02, l * 0.3);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.y = h / 2 + 0.01;
        group.add(door);
      }
    }
  }, [component, wireframe]);

  const shape = component.shape || (component.type === 'Kruhové' ? 'KULATE' : 'HRANATE');
  const isRound = shape === 'KULATE' || component.type === 'Kruhové';

  return (
    <div className="relative w-full h-full min-h-[340px] overflow-hidden rounded-xl bg-slate-950/90 border border-slate-800 shadow-2xl flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 3D HUD Indicators */}
      <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-cyan-500/30 text-xs font-mono text-cyan-300 flex flex-col space-y-1 shadow-lg pointer-events-none">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="font-bold text-white uppercase">
            3D [{component.medium || 'VZT'}] • {isRound ? '⚪ Kruhové (Spiro)' : shape === 'PRECHOD' ? '🔄 Přechodka (4HR ↔ Spiro)' : '🔲 Čtyřhranné (Hranaté)'}
          </span>
        </div>
        <div className="text-[11px] text-slate-300">
          Typ: <strong className="text-cyan-400">{component.type || 'Rovné'}</strong>
          {' • '}
          Dimenze:{' '}
          <strong className="text-emerald-400 font-bold">
            {shape === 'PRECHOD'
              ? `${component.width}×${component.height} → Ø${component.diameter} mm`
              : isRound
              ? component.type === 'Redukce'
                ? `Ø${component.diameter} → Ø${component.diameter2 || 200} mm`
                : `Ø${component.diameter || 250} mm`
              : component.type === 'Redukce'
              ? `${component.width}×${component.height} → ${component.width2 || 600}×${component.height2 || 300} mm`
              : `${component.width || 800} × ${component.height || 400} mm`}
          </strong>
          {component.type === 'Koleno' && (
            <span className="text-amber-300 ml-1">
              (Úhel {component.angle || 90}°, R = {component.radius || Math.round(isRound ? (component.diameter || 250) * 1.0 : (component.width || 800) * 0.8)} mm)
            </span>
          )}
          {component.length && (
            <span className="text-slate-400 ml-1">
              • L = {component.length} mm
            </span>
          )}
        </div>
      </div>

      <div className="absolute bottom-3 right-3 text-[11px] font-mono text-slate-400 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 pointer-events-none flex items-center space-x-2">
        <span>🖱️ Tažením otáčejte 3D</span>
        <span>•</span>
        <span>Kolečkem zoom</span>
      </div>
    </div>
  );
};
