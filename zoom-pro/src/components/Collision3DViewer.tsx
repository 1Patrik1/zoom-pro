import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Layers,
  RotateCcw,
  Maximize2,
  Minimize2,
  Camera,
  Eye,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Move,
  Grid,
  Zap,
  Droplets,
  Building2,
  Info,
  ChevronRight,
  Crosshair,
} from 'lucide-react';
import { SiteCollision, CollisionCoordinates3D } from '../types';

interface Collision3DViewerProps {
  /** The primary collision being inspected or edited */
  selectedCollision?: SiteCollision | null;
  /** All collisions on the site for multi-marker visualization */
  allCollisions?: SiteCollision[];
  /** Custom coordinates if in create/edit modal mode */
  coordinates?: CollisionCoordinates3D;
  /** Photo URL to project as a 3D billboard / HUD */
  photoUrl?: string;
  /** Callback when user changes coordinates via 3D interaction or sliders */
  onCoordinatesChange?: (coords: CollisionCoordinates3D) => void;
  /** Callback when user clicks on a collision marker in the 3D scene */
  onSelectCollision?: (collision: SiteCollision) => void;
  /** Callback to open full-screen photo lightbox */
  onOpenPhotoLightbox?: (url: string, title: string) => void;
  /** Compact mode for modals */
  compact?: boolean;
  /** Custom height */
  height?: string;
  /** Show coordinate inputs panel */
  editable?: boolean;
}

export const Collision3DViewer: React.FC<Collision3DViewerProps> = ({
  selectedCollision,
  allCollisions = [],
  coordinates,
  photoUrl,
  onCoordinatesChange,
  onSelectCollision,
  onOpenPhotoLightbox,
  compact = false,
  height = '500px',
  editable = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Group references for layer toggling & animations
  const worldGroupRef = useRef<THREE.Group | null>(null);
  const vztGroupRef = useRef<THREE.Group | null>(null);
  const electroGroupRef = useRef<THREE.Group | null>(null);
  const ztiGroupRef = useRef<THREE.Group | null>(null);
  const structureGroupRef = useRef<THREE.Group | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const photoBillboardRef = useRef<THREE.Mesh | null>(null);
  const activeBeaconRef = useRef<THREE.Group | null>(null);

  // Current active coordinates state
  const currentCoords: CollisionCoordinates3D = coordinates || selectedCollision?.coordinates3d || {
    x: 14.5,
    y: 8.2,
    z: 3.2,
    floor: '2.NP',
    gridAxis: 'Osa B-4',
  };

  const currentPhoto = photoUrl || selectedCollision?.photoUrl;
  const currentTrade = selectedCollision?.conflictingTrade || 'ELEKTRO';
  const currentSeverity = selectedCollision?.severity || 'HIGH';

  // UI States
  const [autoRotate, setAutoRotate] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPhotoBillboard, setShowPhotoBillboard] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [activeLayerVzt, setActiveLayerVzt] = useState(true);
  const [activeLayerElectro, setActiveLayerElectro] = useState(true);
  const [activeLayerZti, setActiveLayerZti] = useState(true);
  const [activeLayerStructure, setActiveLayerStructure] = useState(true);
  const [showControlsPanel, setShowControlsPanel] = useState(!compact);
  const [currentViewPreset, setCurrentViewPreset] = useState<'ISO' | 'TOP' | 'FRONT' | 'SIDE'>('ISO');
  const [cursorCoordinates, setCursorCoordinates] = useState<{ x: number; y: number } | null>(null);

  // Helper: map trade to hex color
  const getTradeColor = (trade: string) => {
    switch (trade) {
      case 'ELEKTRO':
        return 0xf59e0b; // Amber / Gold
      case 'ZTI':
        return 0x06b6d4; // Cyan / Water Blue
      case 'CHLAZENI':
        return 0x3b82f6; // Royal Blue
      case 'STATIKA':
        return 0xef4444; // Red
      case 'ARCHITEKTURA':
        return 0xa855f7; // Purple
      default:
        return 0xf43f5e; // Rose
    }
  };

  // Helper: map severity to hex color
  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 0xef4444;
      case 'HIGH':
        return 0xf97316;
      case 'MEDIUM':
        return 0xeab308;
      case 'LOW':
        return 0x10b981;
      default:
        return 0xf43f5e;
    }
  };

  // ---------------------------------------------------------------------------
  // Initialize Three.js Scene
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913); // Deep architectural blueprint dark
    scene.fog = new THREE.FogExp2(0x060913, 0.022);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(22, 16, 26);
    camera.lookAt(12, 2, 8);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const mainSunLight = new THREE.DirectionalLight(0xe0f2fe, 1.8);
    mainSunLight.position.set(25, 30, 20);
    mainSunLight.castShadow = true;
    mainSunLight.shadow.mapSize.width = 1024;
    mainSunLight.shadow.mapSize.height = 1024;
    scene.add(mainSunLight);

    const blueFillLight = new THREE.DirectionalLight(0x0284c7, 0.8);
    blueFillLight.position.set(-20, 15, -15);
    scene.add(blueFillLight);

    // 5. World Root Group
    const worldGroup = new THREE.Group();
    worldGroupRef.current = worldGroup;
    scene.add(worldGroup);

    // Layer Groups
    const structGroup = new THREE.Group();
    structureGroupRef.current = structGroup;
    worldGroup.add(structGroup);

    const vztGroup = new THREE.Group();
    vztGroupRef.current = vztGroup;
    worldGroup.add(vztGroup);

    const electroGroup = new THREE.Group();
    electroGroupRef.current = electroGroup;
    worldGroup.add(electroGroup);

    const ztiGroup = new THREE.Group();
    ztiGroupRef.current = ztiGroup;
    worldGroup.add(ztiGroup);

    const markersGroup = new THREE.Group();
    markersGroupRef.current = markersGroup;
    worldGroup.add(markersGroup);

    // -------------------------------------------------------------------------
    // BUILD 3D ENVIRONMENT (Room slice, Columns, Ducts, Trays, Pipes)
    // -------------------------------------------------------------------------

    // A. Floor Slab (Concrete base)
    const floorGeo = new THREE.PlaneGeometry(32, 22);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(14, 0, 9);
    floorMesh.receiveShadow = true;
    structGroup.add(floorMesh);

    // B. Architectural Coordinate Grid on Floor
    const gridHelper = new THREE.GridHelper(32, 32, 0x0284c7, 0x1e293b);
    gridHelper.position.set(14, 0.01, 9);
    structGroup.add(gridHelper);

    // C. Concrete Columns (Železobetonové sloupy at Osy A, B, C, D / 1, 2, 3, 4)
    const columnGeo = new THREE.BoxGeometry(0.7, 4.5, 0.7);
    const columnMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.1,
    });

    const columnPositions = [
      [4, 2.25, 2],
      [14, 2.25, 2],
      [24, 2.25, 2],
      [4, 2.25, 9],
      [14, 2.25, 9],
      [24, 2.25, 9],
      [4, 2.25, 16],
      [14, 2.25, 16],
      [24, 2.25, 16],
    ];

    columnPositions.forEach(([cx, cy, cz]) => {
      const colMesh = new THREE.Mesh(columnGeo, columnMat);
      colMesh.position.set(cx, cy, cz);
      colMesh.castShadow = true;
      colMesh.receiveShadow = true;
      structGroup.add(colMesh);
    });

    // D. Main Concrete Drop Beam (Průvlak) running across Y=9
    const beamGeo = new THREE.BoxGeometry(28, 0.8, 0.6);
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.8,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(14, 4.1, 9);
    beamMesh.castShadow = true;
    structGroup.add(beamMesh);

    // E. VZT Duct Network (Galvanized Steel Rectangular & Spiro Ducts)
    // 1. Main rectangular supply duct (1000x500 mm) running along X axis at Z=3.3m
    const ductMainGeo = new THREE.BoxGeometry(26, 0.5, 1.0);
    const ductMainMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
      envMapIntensity: 1.2,
    });
    const ductMainMesh = new THREE.Mesh(ductMainGeo, ductMainMat);
    ductMainMesh.position.set(14, 3.3, 8.2);
    ductMainMesh.castShadow = true;
    vztGroup.add(ductMainMesh);

    // Flanges & Seams along duct every 2 meters
    for (let fx = 2; fx <= 26; fx += 2.5) {
      const flangeGeo = new THREE.BoxGeometry(0.08, 0.56, 1.06);
      const flangeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
      const flangeMesh = new THREE.Mesh(flangeGeo, flangeMat);
      flangeMesh.position.set(fx, 3.3, 8.2);
      vztGroup.add(flangeMesh);

      // Threaded rod hangers to ceiling
      const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8);
      const rodMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95 });
      const rodLeft = new THREE.Mesh(rodGeo, rodMat);
      rodLeft.position.set(fx, 3.9, 7.6);
      const rodRight = new THREE.Mesh(rodGeo, rodMat);
      rodRight.position.set(fx, 3.9, 8.8);
      vztGroup.add(rodLeft);
      vztGroup.add(rodRight);
    }

    // 2. Branch Spiro circular duct (DN315) running across Z axis
    const spiroGeo = new THREE.CylinderGeometry(0.22, 0.22, 12, 24);
    const spiroMat = new THREE.MeshStandardMaterial({
      color: 0xa1a1aa,
      metalness: 0.8,
      roughness: 0.3,
    });
    const spiroMesh = new THREE.Mesh(spiroGeo, spiroMat);
    spiroMesh.rotation.x = Math.PI / 2;
    spiroMesh.position.set(8.5, 3.1, 8);
    spiroMesh.castShadow = true;
    vztGroup.add(spiroMesh);

    // F. ELEKTRO Cable Tray (Perforated Cable Ladder / Rošt with colored cables)
    // Running across the duct at X=14.5 (creating realistic collision zone!)
    const trayGeo = new THREE.BoxGeometry(0.6, 0.12, 14);
    const trayMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Amber cable tray
      metalness: 0.6,
      roughness: 0.4,
    });
    const trayMesh = new THREE.Mesh(trayGeo, trayMat);
    trayMesh.position.set(14.5, 3.25, 8.2);
    trayMesh.castShadow = true;
    electroGroup.add(trayMesh);

    // Colored cables lying inside the tray
    const cableColors = [0xef4444, 0x3b82f6, 0xeab308, 0x10b981, 0x1e293b];
    cableColors.forEach((color, idx) => {
      const cableGeo = new THREE.CylinderGeometry(0.025, 0.025, 13.8, 8);
      const cableMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
      const cableMesh = new THREE.Mesh(cableGeo, cableMat);
      cableMesh.rotation.x = Math.PI / 2;
      cableMesh.position.set(14.3 + idx * 0.08, 3.32, 8.2);
      electroGroup.add(cableMesh);
    });

    // G. ZTI Waste & Water Pipes (Spádová ležatá kanalizace DN110)
    const ztiGeo = new THREE.CylinderGeometry(0.12, 0.12, 18, 16);
    const ztiMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Water Pipe Blue
      roughness: 0.3,
      metalness: 0.2,
    });
    const ztiMesh = new THREE.Mesh(ztiGeo, ztiMat);
    ztiMesh.rotation.z = Math.PI / 2 - 0.04; // Slight slope (spád)
    ztiMesh.position.set(14, 2.7, 12);
    ztiMesh.castShadow = true;
    ztiGroup.add(ztiMesh);

    // -------------------------------------------------------------------------
    // INTERACTIVE CONTROLS (Orbit, Pan, Zoom, Raycasting)
    // -------------------------------------------------------------------------
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let spherical = {
      radius: 35,
      theta: Math.PI / 4,
      phi: Math.PI / 3.5,
    };
    const target = new THREE.Vector3(14, 2, 8);

    const updateCameraFromSpherical = () => {
      if (!cameraRef.current) return;
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi));
      spherical.radius = Math.max(5, Math.min(60, spherical.radius));

      const x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      const y = target.y + spherical.radius * Math.cos(spherical.phi);
      const z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);

      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(target);
    };

    updateCameraFromSpherical();

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Coordinate raycasting for hover display
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      const intersects = raycaster.intersectObject(floorMesh);
      if (intersects.length > 0) {
        const pt = intersects[0].point;
        setCursorCoordinates({
          x: Math.round(pt.x * 10) / 10,
          y: Math.round(pt.z * 10) / 10,
        });
      }

      if (!isDragging) return;
      const deltaX = e.clientX - prevMouse.x;
      const deltaY = e.clientY - prevMouse.y;

      spherical.theta -= deltaX * 0.008;
      spherical.phi -= deltaY * 0.008;

      updateCameraFromSpherical();
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius += e.deltaY * 0.03;
      updateCameraFromSpherical();
    };

    // Click on floor to set coordinates in editable mode
    const handleClick = (e: MouseEvent) => {
      if (isDragging) return;
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      const intersects = raycaster.intersectObject(floorMesh);
      if (intersects.length > 0 && editable && onCoordinatesChange) {
        const pt = intersects[0].point;
        const newX = Math.max(1, Math.min(28, Math.round(pt.x * 10) / 10));
        const newY = Math.max(1, Math.min(18, Math.round(pt.z * 10) / 10));

        onCoordinatesChange({
          ...currentCoords,
          x: newX,
          y: newY,
        });
      }
    };

    // Touch support for mobile
    let touchStartDist = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        isDragging = false;
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        const deltaX = e.touches[0].clientX - prevMouse.x;
        const deltaY = e.touches[0].clientY - prevMouse.y;
        spherical.theta -= deltaX * 0.008;
        spherical.phi -= deltaY * 0.008;
        updateCameraFromSpherical();
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && touchStartDist > 0) {
        const newDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const deltaDist = touchStartDist - newDist;
        spherical.radius += deltaDist * 0.05;
        updateCameraFromSpherical();
        touchStartDist = newDist;
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
      touchStartDist = 0;
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('click', handleClick);

    container.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    // -------------------------------------------------------------------------
    // RESIZE OBSERVER (Responsive fluid stage)
    // -------------------------------------------------------------------------
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0 && rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });

    resizeObserver.observe(container);

    // -------------------------------------------------------------------------
    // ANIMATION LOOP
    // -------------------------------------------------------------------------
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Auto rotation
      if (autoRotate) {
        spherical.theta += 0.004;
        updateCameraFromSpherical();
      }

      // Beacon pulsing & ring rotation
      if (activeBeaconRef.current) {
        const pulse = 1 + Math.sin(elapsedTime * 4) * 0.15;
        const beaconCore = activeBeaconRef.current.getObjectByName('beaconCore');
        const beaconRings = activeBeaconRef.current.getObjectByName('beaconRings');
        const radarDisk = activeBeaconRef.current.getObjectByName('radarDisk');

        if (beaconCore) beaconCore.scale.set(pulse, pulse, pulse);
        if (beaconRings) beaconRings.rotation.z += 0.03;
        if (radarDisk) {
          radarDisk.scale.set(1 + Math.sin(elapsedTime * 3) * 0.3, 1 + Math.sin(elapsedTime * 3) * 0.3, 1);
        }
      }

      // Billboard always faces camera
      if (photoBillboardRef.current && cameraRef.current) {
        photoBillboardRef.current.quaternion.copy(cameraRef.current.quaternion);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // UPDATE COLLISION MARKERS & PHOTO BILLBOARD IN 3D
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!markersGroupRef.current || !sceneRef.current) return;
    const group = markersGroupRef.current;
    group.clear();

    const posX = currentCoords.x ?? 14.5;
    const posY = currentCoords.z ?? 3.2; // 3D Y is height
    const posZ = currentCoords.y ?? 8.2; // 3D Z is depth

    const sevColorHex = getSeverityColor(currentSeverity);
    const tradeColorHex = getTradeColor(currentTrade);

    // 1. Main Active Collision Beacon Group
    const beacon = new THREE.Group();
    beacon.position.set(posX, posY, posZ);
    activeBeaconRef.current = beacon;

    // A. Inner glowing sphere
    const coreGeo = new THREE.SphereGeometry(0.3, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: sevColorHex,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.name = 'beaconCore';
    beacon.add(coreMesh);

    // B. Outer wireframe pulsing aura
    const haloGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: tradeColorHex,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    beacon.add(haloMesh);

    // C. Rotating Rings
    const ringsGroup = new THREE.Group();
    ringsGroup.name = 'beaconRings';
    const ringGeo = new THREE.RingGeometry(0.5, 0.65, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo, ringMat);
    ringMesh1.rotation.x = Math.PI / 2;
    ringsGroup.add(ringMesh1);
    beacon.add(ringsGroup);

    // D. Drop line to floor grid with coordinate disk
    const leaderLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -posY, 0),
    ]);
    const leaderLineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.2,
      gapSize: 0.1,
    });
    const leaderLine = new THREE.Line(leaderLineGeo, leaderLineMat);
    leaderLine.computeLineDistances();
    beacon.add(leaderLine);

    // E. Target footprint disk on floor
    const radarDiskGeo = new THREE.RingGeometry(0.2, 0.8, 32);
    const radarDiskMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const radarDisk = new THREE.Mesh(radarDiskGeo, radarDiskMat);
    radarDisk.name = 'radarDisk';
    radarDisk.rotation.x = Math.PI / 2;
    radarDisk.position.set(0, -posY + 0.02, 0);
    beacon.add(radarDisk);

    group.add(beacon);

    // 2. 3D Floating Photo Billboard HUD (If photo exists)
    if (currentPhoto && showPhotoBillboard) {
      const loader = new THREE.TextureLoader();
      loader.load(
        currentPhoto,
        texture => {
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;

          // Polaroid-style 3D Frame
          const frameWidth = 3.2;
          const frameHeight = 2.4;

          const photoGeo = new THREE.PlaneGeometry(frameWidth, frameHeight);
          const photoMat = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
          });

          const photoMesh = new THREE.Mesh(photoGeo, photoMat);
          photoMesh.position.set(posX + 2.4, posY + 1.6, posZ);
          photoBillboardRef.current = photoMesh;

          // Border frame
          const borderGeo = new THREE.PlaneGeometry(frameWidth + 0.2, frameHeight + 0.4);
          const borderMat = new THREE.MeshBasicMaterial({
            color: 0x0f172a,
            side: THREE.DoubleSide,
          });
          const borderMesh = new THREE.Mesh(borderGeo, borderMat);
          borderMesh.position.set(0, -0.1, -0.01);
          photoMesh.add(borderMesh);

          // Connecting leader line to beacon
          const photoLineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(posX, posY, posZ),
            new THREE.Vector3(posX + 2.4, posY + 1.6, posZ),
          ]);
          const photoLineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
          const photoLine = new THREE.Line(photoLineGeo, photoLineMat);
          group.add(photoLine);

          group.add(photoMesh);
        },
        undefined,
        err => console.warn('Could not load 3D billboard texture:', err)
      );
    }

    // 3. Other Site Collisions as mini secondary pins
    allCollisions.forEach(col => {
      if (col.id === selectedCollision?.id) return;
      if (!col.coordinates3d) return;

      const otherX = col.coordinates3d.x;
      const otherY = col.coordinates3d.z;
      const otherZ = col.coordinates3d.y;

      const pinGroup = new THREE.Group();
      pinGroup.position.set(otherX, otherY, otherZ);

      const pinGeo = new THREE.ConeGeometry(0.2, 0.6, 12);
      const pinMat = new THREE.MeshBasicMaterial({
        color: getSeverityColor(col.severity),
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.rotation.x = Math.PI;
      pinGroup.add(pinMesh);

      group.add(pinGroup);
    });
  }, [currentCoords, currentPhoto, currentTrade, currentSeverity, showPhotoBillboard, allCollisions, selectedCollision]);

  // ---------------------------------------------------------------------------
  // TOGGLE LAYER VISIBILITIES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (vztGroupRef.current) vztGroupRef.current.visible = activeLayerVzt;
  }, [activeLayerVzt]);

  useEffect(() => {
    if (electroGroupRef.current) electroGroupRef.current.visible = activeLayerElectro;
  }, [activeLayerElectro]);

  useEffect(() => {
    if (ztiGroupRef.current) ztiGroupRef.current.visible = activeLayerZti;
  }, [activeLayerZti]);

  useEffect(() => {
    if (structureGroupRef.current) structureGroupRef.current.visible = activeLayerStructure;
  }, [activeLayerStructure]);

  // ---------------------------------------------------------------------------
  // VIEW PRESETS
  // ---------------------------------------------------------------------------
  const applyViewPreset = (preset: 'ISO' | 'TOP' | 'FRONT' | 'SIDE') => {
    if (!cameraRef.current) return;
    setCurrentViewPreset(preset);
    const target = new THREE.Vector3(14, 2, 8);

    switch (preset) {
      case 'ISO':
        cameraRef.current.position.set(24, 18, 24);
        break;
      case 'TOP':
        cameraRef.current.position.set(14, 34, 8);
        break;
      case 'FRONT':
        cameraRef.current.position.set(14, 3, 30);
        break;
      case 'SIDE':
        cameraRef.current.position.set(36, 3, 8);
        break;
    }
    cameraRef.current.lookAt(target);
  };

  const handleResetCamera = () => {
    applyViewPreset('ISO');
    setAutoRotate(false);
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl border-cyan-500' : ''
      }`}
      style={{ height: isFullscreen ? 'calc(100vh - 32px)' : height }}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing relative" />

      {/* Top Header HUD Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Title & Collision Tag */}
        <div className="flex items-center space-x-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto">
          <div className="p-1 rounded-lg bg-rose-500/20 text-rose-400">
            <Crosshair className="w-4 h-4 text-rose-400 animate-spin" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-white flex items-center space-x-1.5">
              <span>BIM 3D Koordinace Kolizí</span>
              {selectedCollision?.collisionTag && (
                <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-700 text-[10px] font-mono font-bold">
                  {selectedCollision.collisionTag}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Pozice: X: {currentCoords.x.toFixed(1)}m • Y: {currentCoords.y.toFixed(1)}m • Z: +{currentCoords.z.toFixed(1)}m ({currentCoords.floor || '2.NP'})
            </div>
          </div>
        </div>

        {/* Action HUD Toolbar */}
        <div className="flex items-center space-x-1.5 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto">
          {/* Preset Buttons */}
          <button
            type="button"
            onClick={() => applyViewPreset('ISO')}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
              currentViewPreset === 'ISO' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            3D Iso
          </button>
          <button
            type="button"
            onClick={() => applyViewPreset('TOP')}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
              currentViewPreset === 'TOP' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Půdorys
          </button>
          <button
            type="button"
            onClick={() => applyViewPreset('FRONT')}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
              currentViewPreset === 'FRONT' ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Řez
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

          {/* Auto Rotate */}
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-lg text-xs transition-all ${
              autoRotate ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Auto-rotace scény"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
          </button>

          {/* Photo Billboard Toggle */}
          {currentPhoto && (
            <button
              type="button"
              onClick={() => setShowPhotoBillboard(!showPhotoBillboard)}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                showPhotoBillboard
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                  : 'text-slate-500 hover:bg-slate-800'
              }`}
              title="Přepnout 3D zobrazení fotky v prostoru"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Reset Camera */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Resetovat pohled"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title={isFullscreen ? 'Zmenšit' : 'Celá obrazovka'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Layer Visibility Pills Overlay (Bottom Left) */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 text-[10px] font-mono z-10 shadow-lg">
        <span className="text-slate-500 px-1 font-bold">Vrstvy:</span>
        <button
          type="button"
          onClick={() => setActiveLayerVzt(!activeLayerVzt)}
          className={`px-2 py-0.5 rounded-md flex items-center space-x-1 border transition-all ${
            activeLayerVzt
              ? 'bg-slate-800 text-cyan-300 border-cyan-500/50'
              : 'bg-slate-900/50 text-slate-500 border-slate-800'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>VZT Potrubí</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveLayerElectro(!activeLayerElectro)}
          className={`px-2 py-0.5 rounded-md flex items-center space-x-1 border transition-all ${
            activeLayerElectro
              ? 'bg-slate-800 text-amber-300 border-amber-500/50'
              : 'bg-slate-900/50 text-slate-500 border-slate-800'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Elektro Trasy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveLayerZti(!activeLayerZti)}
          className={`px-2 py-0.5 rounded-md flex items-center space-x-1 border transition-all ${
            activeLayerZti
              ? 'bg-slate-800 text-blue-300 border-blue-500/50'
              : 'bg-slate-900/50 text-slate-500 border-slate-800'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>ZTI Voda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveLayerStructure(!activeLayerStructure)}
          className={`px-2 py-0.5 rounded-md flex items-center space-x-1 border transition-all ${
            activeLayerStructure
              ? 'bg-slate-800 text-slate-200 border-slate-600'
              : 'bg-slate-900/50 text-slate-500 border-slate-800'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>Statika / Sloupy</span>
        </button>
      </div>

      {/* Floating Photo Preview Widget (Bottom Right) */}
      {currentPhoto && (
        <div className="absolute bottom-3 right-3 z-10">
          <div className="p-1.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700 shadow-xl flex items-center space-x-2">
            <img
              src={currentPhoto}
              alt="Collision thumbnail"
              onClick={() => onOpenPhotoLightbox && onOpenPhotoLightbox(currentPhoto, selectedCollision?.title || 'Foto kolize')}
              className="w-12 h-12 object-cover rounded-lg border border-slate-600 cursor-pointer hover:opacity-80 transition-all"
            />
            <div className="pr-1 text-left">
              <div className="text-[10px] font-bold text-white">Fotodokumentace</div>
              <div className="text-[9px] text-slate-400 font-mono">Připojeno k bodu v 3D</div>
              <button
                type="button"
                onClick={() => onOpenPhotoLightbox && onOpenPhotoLightbox(currentPhoto, selectedCollision?.title || 'Foto kolize')}
                className="text-[10px] text-cyan-400 hover:underline font-bold"
              >
                Zvětšit foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coordinate & Sliders Drawer (If editable) */}
      {editable && onCoordinatesChange && (
        <div className="absolute top-16 right-3 bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-2xl w-64 space-y-2.5 text-xs z-10">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-200 flex items-center space-x-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D Souřadnice Kolize</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Klikněte do modelu</span>
          </div>

          {/* Coordinate Sliders */}
          <div className="space-y-2 font-mono">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                <span>Osa X (délka):</span>
                <span className="text-cyan-400 font-bold">{currentCoords.x.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="1"
                max="28"
                step="0.1"
                value={currentCoords.x}
                onChange={e => onCoordinatesChange({ ...currentCoords, x: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                <span>Osa Y (hloubka):</span>
                <span className="text-cyan-400 font-bold">{currentCoords.y.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="1"
                max="18"
                step="0.1"
                value={currentCoords.y}
                onChange={e => onCoordinatesChange({ ...currentCoords, y: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                <span>Výška Z (od podlahy):</span>
                <span className="text-amber-400 font-bold">+{currentCoords.z.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.2"
                step="0.1"
                value={currentCoords.z}
                onChange={e => onCoordinatesChange({ ...currentCoords, z: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>

          {/* Quick Positioning Presets */}
          <div className="pt-1 border-t border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 font-mono block">Rychlé pozice v BIM:</span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => onCoordinatesChange({ ...currentCoords, x: 14.5, y: 8.2, z: 3.2 })}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-center"
              >
                ⚡ Křížení Elektro
              </button>
              <button
                type="button"
                onClick={() => onCoordinatesChange({ ...currentCoords, x: 8.5, y: 8.0, z: 3.1 })}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-center"
              >
                🌪️ Spiro odbočka
              </button>
              <button
                type="button"
                onClick={() => onCoordinatesChange({ ...currentCoords, x: 14.0, y: 9.0, z: 3.8 })}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-center"
              >
                🏛️ Průvlak / Nosník
              </button>
              <button
                type="button"
                onClick={() => onCoordinatesChange({ ...currentCoords, x: 14.0, y: 12.0, z: 2.7 })}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-center"
              >
                💧 Odpad ZTI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
