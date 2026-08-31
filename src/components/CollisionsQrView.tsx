import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  QrCode,
  Printer,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  Plus,
  Filter,
  Layers,
  Sparkles,
  Share2,
  Mail,
  MessageSquare,
  RefreshCw,
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Send,
  Download,
  Scan,
  Maximize2,
  ChevronRight,
  User as UserIcon,
  Navigation,
  FileText,
  Eye,
  Trash2,
  Bot,
  Cpu,
  Lightbulb,
  Zap,
  ShieldAlert,
  HelpCircle,
  CheckCircle,
  Box,
  Compass,
  Crosshair,
  Sliders,
} from 'lucide-react';
import { SiteCollision, QrLabelSpec, Project, User, CollisionCoordinates3D } from '../types';
import { Collision3DViewer } from './Collision3DViewer';

interface CollisionsQrViewProps {
  collisions: SiteCollision[];
  qrLabels: QrLabelSpec[];
  projects?: Project[];
  currentUser?: User;
  onAddCollision: (col: Omit<SiteCollision, 'id' | 'createdAt'>) => void;
  onUpdateCollisionStatus: (id: string, status: SiteCollision['status']) => void;
  onPrintQrLabel: (id: string) => void;
  onUpdateQrLabel?: (id: string, updates: Partial<QrLabelSpec>) => void;
  onDeleteCollision?: (id: string) => void;
}

export const CollisionsQrView: React.FC<CollisionsQrViewProps> = ({
  collisions,
  qrLabels,
  projects = [],
  currentUser,
  onAddCollision,
  onUpdateCollisionStatus,
  onPrintQrLabel,
  onUpdateQrLabel,
  onDeleteCollision,
}) => {
  const [activeTab, setActiveTab] = useState<'kolize' | 'qr'>('kolize');
  
  // 3D View and Layout state
  const [collisionsLayout, setCollisionsLayout] = useState<'CARDS' | '3D_VIEW' | 'SPLIT'>('CARDS');
  const [selected3dCollision, setSelected3dCollision] = useState<SiteCollision | null>(collisions[0] || null);
  const [show3dModalForCollision, setShow3dModalForCollision] = useState<SiteCollision | null>(null);

  // Modals state
  const [showAddCollisionModal, setShowAddCollisionModal] = useState(false);
  const [showLiveCameraModal, setShowLiveCameraModal] = useState(false);
  const [showQrScannerModal, setShowQrScannerModal] = useState(false);
  const [showQrPhotoModal, setShowQrPhotoModal] = useState<QrLabelSpec | null>(null);
  const [selectedPhotoLightbox, setSelectedPhotoLightbox] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [selectedCollisionAiModal, setSelectedCollisionAiModal] = useState<SiteCollision | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter state
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tradeFilter, setTradeFilter] = useState<string>('ALL');

  // Form state for New Collision
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || 'proj-001');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState<SiteCollision['severity']>('HIGH');
  const [conflictingTrade, setConflictingTrade] = useState<SiteCollision['conflictingTrade']>('ZTI');
  const [description, setDescription] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState<string>('');
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string>('');
  const [sendViaEmail, setSendViaEmail] = useState(true);
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(false);
  const [sendViaSystem, setSendViaSystem] = useState(true);
  const [assignedTo, setAssignedTo] = useState('Ing. Petr Dvořák (Koordinátor BIM / TDI)');

  // 3D Coordinates Form state
  const [formCoords3d, setFormCoords3d] = useState<CollisionCoordinates3D>({
    x: 14.5,
    y: 8.2,
    z: 3.2,
    floor: '2.NP',
    gridAxis: 'Osa B-4',
  });

  // AI Collision Vision Analysis state
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    detectedObjects: string[];
    collisionTag: string;
    suggestedTitle: string;
    conflictingTrade: SiteCollision['conflictingTrade'];
    severity: SiteCollision['severity'];
    description: string;
    resolutionNote: string;
    complianceNotes?: string;
    confidenceScore?: number;
    isSimulated?: boolean;
    notice?: string;
  } | null>(null);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [analyzingProgressStep, setAnalyzingProgressStep] = useState<string>('');

  // Camera & Stream Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Active label for installation photo
  const [qrPhotoPreview, setQrPhotoPreview] = useState<string>('');

  // Scanned QR result
  const [scannedTag, setScannedTag] = useState<string>('');
  const [scannedLabel, setScannedLabel] = useState<QrLabelSpec | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Start WebRTC Camera Stream
  const startCamera = async (facingMode: 'environment' | 'user' = 'environment') => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Webová kamera není tímto prohlížečem podporována. Použijte nahrání souboru.');
        return;
      }
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera access denied or failed:', err);
      setCameraError('Nepodařilo se spustit kameru. Můžete vybrat fotografii ze zařízení.');
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // When live camera modal opens, start camera
  useEffect(() => {
    if (showLiveCameraModal) {
      startCamera(cameraFacingMode);
    } else {
      stopCamera();
    }
  }, [showLiveCameraModal]);

  // Run Gemini AI Vision Analysis on Collision Photo
  const analyzeCollisionPhotoWithGemini = async (imageDataUrl?: string) => {
    const photoToAnalyze = imageDataUrl || capturedPhotoUrl;
    if (!photoToAnalyze) {
      showToast('⚠️ Nejprve vyfoťte nebo nahrajte fotografii kolize');
      return;
    }

    setIsAnalyzingImage(true);
    setAiAnalysisError(null);
    setAnalyzingProgressStep('Odesílání snímku do multimodálního modelu Gemini AI...');

    const proj = projects.find(p => p.id === selectedProjectId);

    const stepTimer1 = setTimeout(() => {
      setAnalyzingProgressStep('Detekce potrubí, kabelových žlabů a nosných konstrukcí...');
    }, 900);

    const stepTimer2 = setTimeout(() => {
      setAnalyzingProgressStep('Vyhodnocování prostorového střetu a návrh štítku dle norem ČSN...');
    }, 2100);

    try {
      const res = await fetch('/api/ai/analyze-collision-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: photoToAnalyze,
          locationNote: location || 'Stavební prostor VZT',
          projectName: proj?.name || 'VZT Projekt',
        }),
      });

      if (!res.ok) {
        throw new Error(`Server vrátil chybový stav ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAiAnalysisResult(data);
      showToast(`✨ Gemini AI: Detekováno ${data.detectedObjects?.length || 0} objektů, navržen štítek ${data.collisionTag}`);
    } catch (err: any) {
      console.error('AI Analysis Error:', err);
      setAiAnalysisError(err?.message || 'Nepodařilo se dokončit analýzu snímku');
      showToast('⚠️ Chyba při analýze snímku modelem Gemini');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsAnalyzingImage(false);
      setAnalyzingProgressStep('');
    }
  };

  const applyAiSuggestionsToForm = () => {
    if (!aiAnalysisResult) return;
    if (aiAnalysisResult.suggestedTitle) setTitle(aiAnalysisResult.suggestedTitle);
    if (aiAnalysisResult.conflictingTrade) setConflictingTrade(aiAnalysisResult.conflictingTrade);
    if (aiAnalysisResult.severity) setSeverity(aiAnalysisResult.severity);
    if (aiAnalysisResult.description) setDescription(aiAnalysisResult.description);
    if (aiAnalysisResult.resolutionNote) setResolutionNote(aiAnalysisResult.resolutionNote);
    showToast('✅ Návrh Gemini AI byl úspěšně přenesen do formuláře');
  };

  // Capture Frame from Video with Watermark
  const capturePhoto = (targetType: 'COLLISION' | 'QR_LABEL', autoAnalyze: boolean = false) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add professional Watermark stamp
    const nowStr = new Date().toLocaleString('cs-CZ');
    const projName = projects.find(p => p.id === selectedProjectId)?.name || 'Stavba VZT';
    const tagText = targetType === 'COLLISION' 
      ? `🚨 VZT KOLIZE • ${location || 'Stavba'} • ${nowStr}`
      : `🏷️ VZT INSTALACE • ${showQrPhotoModal?.tag || 'DÍL'} • ${nowStr}`;

    // Stamp bar background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    // Stamp text
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`ZOOM-PRO | ${projName}`, 20, canvas.height - 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(tagText, 20, canvas.height - 10);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    if (targetType === 'COLLISION') {
      setCapturedPhotoUrl(dataUrl);
      setShowLiveCameraModal(false);
      setShowAddCollisionModal(true);
      showToast('📸 Fotografie kolize byla pořízena a orazítkována');
      if (autoAnalyze) {
        analyzeCollisionPhotoWithGemini(dataUrl);
      }
    } else if (targetType === 'QR_LABEL') {
      setQrPhotoPreview(dataUrl);
      stopCamera();
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'COLLISION' | 'QR_LABEL', autoAnalyze: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === 'COLLISION') {
        setCapturedPhotoUrl(result);
        setShowLiveCameraModal(false);
        setShowAddCollisionModal(true);
        showToast('📁 Fotografie byla nahrána ze zařízení');
        if (autoAnalyze) {
          analyzeCollisionPhotoWithGemini(result);
        }
      } else {
        setQrPhotoPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Auto-fetch GPS
  const handleGetGps = () => {
    if (!navigator.geolocation) {
      alert('Geolokace není v tomto zařízení podporována');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} (±${Math.round(pos.coords.accuracy)}m)`;
        setGpsCoordinates(coords);
        setIsGettingGps(false);
        showToast(`📍 GPS poloha získána: ${coords}`);
      },
      err => {
        console.warn('GPS error:', err);
        setIsGettingGps(false);
        alert('Nepodařilo se načíst GPS souřadnice. Zkontrolujte oprávnění polohy.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save & Dispatch Collision
  const handleSaveAndSendCollision = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find(p => p.id === selectedProjectId);
    const reporterName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Jan Novák (Montér / Stavbyvedoucí)';
    const channels: ('SYSTEM' | 'EMAIL' | 'WHATSAPP')[] = [];
    if (sendViaSystem) channels.push('SYSTEM');
    if (sendViaEmail) channels.push('EMAIL');
    if (sendViaWhatsApp) channels.push('WHATSAPP');

    const newCollision: any = {
      projectId: selectedProjectId,
      projectName: proj?.name || 'Logistické Centrum D1 Park',
      title,
      location: location || '1.PP Strojovna VZT',
      severity,
      conflictingTrade,
      status: 'OPEN' as const,
      reportedByName: reporterName,
      photoUrl: capturedPhotoUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80',
      description,
      resolutionNote: resolutionNote || undefined,
      gpsCoordinates: gpsCoordinates || undefined,
      sentChannels: channels,
      assignedTo: assignedTo || undefined,
      collisionTag: aiAnalysisResult?.collisionTag || undefined,
      coordinates3d: formCoords3d,
      aiAnalysis: aiAnalysisResult ? {
        detectedObjects: aiAnalysisResult.detectedObjects,
        collisionTag: aiAnalysisResult.collisionTag,
        suggestedTitle: aiAnalysisResult.suggestedTitle,
        conflictingTrade: aiAnalysisResult.conflictingTrade,
        severity: aiAnalysisResult.severity,
        description: aiAnalysisResult.description,
        resolutionNote: aiAnalysisResult.resolutionNote,
        complianceNotes: aiAnalysisResult.complianceNotes,
        confidenceScore: aiAnalysisResult.confidenceScore,
        analyzedAt: new Date().toISOString(),
      } : undefined,
    };

    onAddCollision(newCollision);

    // Multi-channel dispatching actions
    if (sendViaWhatsApp) {
      const waText = encodeURIComponent(
        `🚨 *HLÁŠENÍ STAVEBNÍ KOLIZE VZT*\n` +
        `• Štítek: ${aiAnalysisResult?.collisionTag || 'N/A'}\n` +
        `• Stavba: ${proj?.name || 'Stavba'}\n` +
        `• Pozice: ${location}\n` +
        `• Závažnost: ${severity}\n` +
        `• Konflikt: ${conflictingTrade}\n` +
        `• Popis: ${description}\n` +
        `• Hlásí: ${reporterName}\n` +
        `• GPS: ${gpsCoordinates || 'N/A'}`
      );
      window.open(`https://wa.me/?text=${waText}`, '_blank');
    }

    if (sendViaEmail) {
      const tagPrefix = aiAnalysisResult?.collisionTag ? `[${aiAnalysisResult.collisionTag}] ` : '';
      const subject = encodeURIComponent(`${tagPrefix}[KOLIZE VZT - ${severity}] ${proj?.name || 'Projekt'} - ${location}`);
      const body = encodeURIComponent(
        `Dobrý den,\n\n` +
        `na stavbě "${proj?.name || 'Projekt'}" byla zaznamenána nová prostorová kolize VZT:\n\n` +
        `Štítek kolize: ${aiAnalysisResult?.collisionTag || 'KOL-MANUAL'}\n` +
        `Název: ${title}\n` +
        `Lokalizace: ${location}\n` +
        `Konfliktní profese: ${conflictingTrade}\n` +
        `Závažnost: ${severity}\n` +
        `GPS: ${gpsCoordinates || 'N/A'}\n\n` +
        (aiAnalysisResult?.detectedObjects ? `Identifikované objekty AI: ${aiAnalysisResult.detectedObjects.join(', ')}\n\n` : '') +
        `Popis problému:\n${description}\n\n` +
        `Navržené řešení:\n${resolutionNote || 'Nutno posoudit koordinátorem BIM a stavbyvedoucím'}\n\n` +
        (aiAnalysisResult?.complianceNotes ? `ČSN normy: ${aiAnalysisResult.complianceNotes}\n\n` : '') +
        `Hlášení odeslal: ${reporterName}\nDatum: ${new Date().toLocaleString('cs-CZ')}\n` +
        `Systém: ZOOM-PRO Enterprise VZT`
      );
      const mailtoLink = document.createElement('a');
      mailtoLink.href = `mailto:koordinator.bim@stavba.cz?subject=${subject}&body=${body}`;
      mailtoLink.target = '_blank';
      mailtoLink.click();
    }

    setShowAddCollisionModal(false);
    showToast(`✅ Kolize "${title}" byla uložena a odeslána stavbyvedoucímu & koordinátorovi.`);
    
    // Reset form
    setTitle('');
    setLocation('');
    setDescription('');
    setResolutionNote('');
    setCapturedPhotoUrl('');
    setGpsCoordinates('');
    setAiAnalysisResult(null);
    setAiAnalysisError(null);
  };

  // Quick Open Camera
  const handleQuickCameraOpen = () => {
    setCapturedPhotoUrl('');
    setShowLiveCameraModal(true);
  };

  // Confirm installation photo for QR label
  const handleSaveQrInstallationPhoto = () => {
    if (!showQrPhotoModal || !qrPhotoPreview) return;
    if (onUpdateQrLabel) {
      onUpdateQrLabel(showQrPhotoModal.id, {
        installationStatus: 'INSTALLED',
        installationPhotoUrl: qrPhotoPreview,
        installedAt: new Date().toISOString(),
        installedByName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Montér VZT',
      });
    }
    showToast(`📸 Fotodokumentace k prvku ${showQrPhotoModal.tag} byla uložena a odeslána.`);
    setShowQrPhotoModal(null);
    setQrPhotoPreview('');
  };

  // Filter collisions
  const filteredCollisions = collisions.filter(c => {
    if (severityFilter !== 'ALL' && c.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (tradeFilter !== 'ALL' && c.conflictingTrade !== tradeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hidden Canvas for Frame Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white border-2 border-cyan-500 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>Site Operations & BIM Quality</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">ČSN EN 1507 • ISO 19650</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2 mt-1.5">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
            <span>Stavební Kolize & QR Štítky</span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5 max-w-2xl">
            Okamžité vyfocení a odeslání prostorových kolizí VZT na stavbě, geolokační protokolování a QR kódování dílů.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Camera Snap & Send Button */}
          <button
            onClick={handleQuickCameraOpen}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 hover:from-rose-400 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/30 flex items-center space-x-2 transition-all transform active:scale-95 border border-rose-400/30"
          >
            <Camera className="w-4 h-4 text-white animate-pulse" />
            <span>Vyfotit & poslat kolizi</span>
          </button>

          {/* Form Modal Button */}
          <button
            onClick={() => {
              setCapturedPhotoUrl('');
              setShowAddCollisionModal(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Záznam bez fotky</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('kolize')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'kolize'
                ? 'bg-rose-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Kolize na stavbě ({collisions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'qr'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Štítky dílů ({qrLabels.length})</span>
          </button>
        </div>

        {activeTab === 'kolize' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* View Layout Switcher (Cards / 3D BIM / Split) */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setCollisionsLayout('CARDS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  collisionsLayout === 'CARDS'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Zobrazit přehledné karty"
              >
                <span>🔲 Karty</span>
              </button>
              <button
                type="button"
                onClick={() => setCollisionsLayout('3D_VIEW')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  collisionsLayout === '3D_VIEW'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Zobrazit 3D BIM model s koordinací"
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D BIM Model</span>
              </button>
              <button
                type="button"
                onClick={() => setCollisionsLayout('SPLIT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  collisionsLayout === 'SPLIT'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Rozdělený pohled (Karty + 3D Model)"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Rozdělený</span>
              </button>
            </div>

            <div className="flex items-center space-x-1 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtr:</span>
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono"
            >
              <option value="ALL">Všechny závažnosti</option>
              <option value="CRITICAL">Kritická</option>
              <option value="HIGH">Vysoká</option>
              <option value="MEDIUM">Střední</option>
              <option value="LOW">Nízká</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono"
            >
              <option value="ALL">Všechny stavy</option>
              <option value="OPEN">OPEN (Otevřeno)</option>
              <option value="IN_PROGRESS">V ŘEŠENÍ</option>
              <option value="RESOLVED">VYŘEŠENO</option>
              <option value="ACCEPTED_COMPROMISE">KOMPROMIS</option>
            </select>

            {/* Trade Filter */}
            <select
              value={tradeFilter}
              onChange={e => setTradeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono"
            >
              <option value="ALL">Všechny profese</option>
              <option value="ZTI">ZTI (Voda / Odpady)</option>
              <option value="ELEKTRO">Elektro kabelové trasy</option>
              <option value="STATIKA">Statika / ŽB průvlak</option>
              <option value="CHLAZENI">Chlazení</option>
            </select>
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowQrScannerModal(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center space-x-1.5"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Skenovat QR kamerou</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hromadný tisk štítků</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KOLIZE LIST                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'kolize' && (
        <div>
          {filteredCollisions.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/60 rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">Žádné zaznamenané kolize</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Všechny trasy VZT jsou v souladu s koordinací BIM. V případě prostorového konfliktu klikněte na tlačítko "Vyfotit & poslat kolizi".
              </p>
              <button
                onClick={handleQuickCameraOpen}
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Vyfotit kolizi</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCollisions.map(col => {
                const sevColor =
                  col.severity === 'CRITICAL'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : col.severity === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : col.severity === 'MEDIUM'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700';

                const statusColor =
                  col.status === 'RESOLVED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : col.status === 'IN_PROGRESS'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : col.status === 'ACCEPTED_COMPROMISE'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

                return (
                  <div
                    key={col.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    {/* Card Photo Header */}
                    {col.photoUrl && (
                      <div
                        onClick={() =>
                          setSelectedPhotoLightbox({
                            url: col.photoUrl!,
                            title: col.title,
                            subtitle: `${col.location} • ${col.projectName}`,
                          })
                        }
                        className="relative aspect-video w-full bg-slate-950 cursor-pointer group overflow-hidden border-b border-slate-800"
                      >
                        <img
                          src={col.photoUrl}
                          alt="Kolize foto"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-80" />

                        <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5 max-w-[85%]">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${sevColor}`}>
                            {col.severity}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950/80 text-cyan-300 border border-slate-700">
                            {col.conflictingTrade}
                          </span>
                          {col.collisionTag && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/90 text-purple-300 border border-purple-700/80 flex items-center space-x-1 shadow-sm">
                              <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                              <span>{col.collisionTag}</span>
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-slate-950/80 backdrop-blur-md text-[10px] text-slate-300 flex items-center space-x-1 border border-slate-700">
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>Zvětšit foto</span>
                        </div>
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {!col.photoUrl && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${sevColor}`}>
                              {col.severity}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 text-cyan-300 border border-slate-800">
                              {col.conflictingTrade}
                            </span>
                            {col.collisionTag && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/90 text-purple-300 border border-purple-700/80 flex items-center space-x-1">
                                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                <span>{col.collisionTag}</span>
                              </span>
                            )}
                          </div>
                        )}

                        <div className="text-[11px] font-mono text-slate-500">{col.projectName}</div>
                        <h3 className="text-sm font-bold text-slate-100 mt-0.5 leading-snug">{col.title}</h3>

                        <div className="text-xs text-cyan-400 flex items-center space-x-1 mt-1.5 font-semibold">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{col.location}</span>
                        </div>

                        {col.gpsCoordinates && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center space-x-1">
                            <Navigation className="w-3 h-3 text-emerald-400" />
                            <span>GPS: {col.gpsCoordinates}</span>
                          </div>
                        )}

                        {/* AI Detected Objects Chips */}
                        {col.aiAnalysis?.detectedObjects && col.aiAnalysis.detectedObjects.length > 0 && (
                          <div className="mt-2.5 p-2 rounded-xl bg-purple-950/20 border border-purple-900/40 space-y-1">
                            <div className="text-[10px] font-bold text-purple-400 flex items-center space-x-1">
                              <Bot className="w-3 h-3" />
                              <span>Gemini AI detekované prvky:</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {col.aiAnalysis.detectedObjects.map((obj, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-slate-900/90 text-[10px] font-mono text-slate-200 border border-slate-700 flex items-center space-x-1"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                  <span>{obj}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-slate-400 mt-2.5 leading-relaxed bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                          {col.description}
                        </p>

                        {col.resolutionNote && (
                          <div className="mt-2 text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900/50 p-2 rounded-lg">
                            <strong className="block text-[10px] uppercase font-bold text-emerald-400">Navržené řešení:</strong>
                            {col.resolutionNote}
                          </div>
                        )}
                      </div>

                      {/* Card Footer & Status Update */}
                      <div className="border-t border-slate-800 pt-3 mt-4 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center space-x-1 truncate">
                            <UserIcon className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{col.reportedByName}</span>
                          </div>
                          <span className="font-mono text-slate-500 text-[10px]">{col.createdAt.split('T')[0]}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <select
                            value={col.status}
                            onChange={e => onUpdateCollisionStatus(col.id, e.target.value as any)}
                            className={`flex-1 bg-slate-950 border rounded-lg px-2.5 py-1 text-xs font-mono font-bold focus:outline-none ${statusColor}`}
                          >
                            <option value="OPEN">🔴 OPEN (Otevřeno)</option>
                            <option value="IN_PROGRESS">🟡 V ŘEŠENÍ</option>
                            <option value="RESOLVED">🟢 VYŘEŠENO</option>
                            <option value="ACCEPTED_COMPROMISE">🟣 KOMPROMIS</option>
                          </select>

                          {/* Inspect AI Analysis Button */}
                          {col.aiAnalysis && (
                            <button
                              type="button"
                              onClick={() => setSelectedCollisionAiModal(col)}
                              className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40"
                              title="Zobrazit Gemini AI analýzu kolize a ČSN normy"
                            >
                              <Bot className="w-3.5 h-3.5 text-purple-400" />
                            </button>
                          )}

                          {/* Quick Share on WhatsApp Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const waText = encodeURIComponent(
                                `🚨 *KOLIZE VZT: ${col.title}*\n` +
                                (col.collisionTag ? `• Štítek: ${col.collisionTag}\n` : '') +
                                `• Místo: ${col.location}\n` +
                                `• Závažnost: ${col.severity}\n` +
                                `• Popis: ${col.description}`
                              );
                              window.open(`https://wa.me/?text=${waText}`, '_blank');
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                            title="Sdílet na WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Share via Email Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const subject = encodeURIComponent(`[KOLIZE] ${col.projectName} - ${col.title}`);
                              const body = encodeURIComponent(
                                `Protokol o kolizi:\n\n${col.title}\nŠtítek: ${col.collisionTag || 'N/A'}\nLokalita: ${col.location}\nZávažnost: ${col.severity}\nPopis:\n${col.description}\n\nOdkaz: ZOOM-PRO Enterprise`
                              );
                              window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                            }}
                            className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40"
                            title="Odeslat e-mailem"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {onDeleteCollision && (
                            <button
                              type="button"
                              onClick={() => onDeleteCollision(col.id)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700"
                              title="Smazat kolizi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QR LABELS & INSTALLATION PHOTO LOGGING                             */}
      {/* ========================================================================= */}
      {activeTab === 'qr' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                <span>QR Štítky pro dílnu, montáž a fotodokumentaci</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Každý VZT díl má vygenerovaný QR kód se specifikací, číslem pozice, patrem a napojením trasy. Montéři mohou štítek na stavbě naskenovat, vyfotit instalaci nebo rovnou odeslat hlášení.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowQrScannerModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 text-xs font-bold rounded-xl flex items-center space-x-2 shadow-lg shadow-cyan-500/20"
              >
                <Scan className="w-4 h-4" />
                <span>Skenovat QR kamerou</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {qrLabels.map(label => (
              <div
                key={label.id}
                className="bg-white text-slate-950 p-4 rounded-2xl border-2 border-slate-300 shadow-xl flex flex-col justify-between font-sans relative overflow-hidden"
              >
                {/* Status Watermark / Pill */}
                {label.installationStatus === 'INSTALLED' && (
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider flex items-center space-x-1 shadow">
                    <Check className="w-3 h-3" />
                    <span>Namontováno</span>
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-600">VZT SYSTEM s.r.o.</div>
                      <div className="text-base font-black text-slate-950 font-mono leading-none mt-0.5">{label.tag}</div>
                      <div className="text-[11px] font-bold text-slate-700">{label.projectCode}</div>
                    </div>

                    {/* QR Code Icon / Target */}
                    <div
                      onClick={() => {
                        setScannedLabel(label);
                        setShowQrScannerModal(true);
                      }}
                      className="w-14 h-14 bg-slate-950 p-1.5 rounded-lg flex items-center justify-center text-white cursor-pointer hover:bg-slate-800 transition-colors shadow"
                      title="Klikněte pro zobrazení detailu QR"
                    >
                      <QrCode className="w-full h-full text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mt-2.5 font-mono">
                    <div className="bg-slate-100 p-1.5 rounded">
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Typ prvku</div>
                      <div className="font-bold text-slate-950 truncate">{label.componentType}</div>
                    </div>
                    <div className="bg-slate-100 p-1.5 rounded">
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Rozměr</div>
                      <div className="font-bold text-slate-950">{label.dimensions}</div>
                    </div>
                    <div className="bg-slate-100 p-1.5 rounded">
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Pozice / Patro</div>
                      <div className="font-bold text-slate-950">{label.positionNumber} ({label.floor})</div>
                    </div>
                    <div className="bg-slate-100 p-1.5 rounded">
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Větev</div>
                      <div className="font-bold text-slate-950">{label.systemBranch}</div>
                    </div>
                  </div>

                  {/* Photo Documentation Thumbnail if Installed */}
                  {label.installationPhotoUrl && (
                    <div
                      onClick={() =>
                        setSelectedPhotoLightbox({
                          url: label.installationPhotoUrl!,
                          title: `Montáž prvku ${label.tag}`,
                          subtitle: `${label.componentType} (${label.dimensions}) • ${label.projectCode}`,
                        })
                      }
                      className="mt-2.5 aspect-video w-full rounded-xl overflow-hidden border border-slate-300 relative cursor-pointer group"
                    >
                      <img src={label.installationPhotoUrl} alt="Montáž foto" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute bottom-1.5 left-1.5 bg-slate-950/80 text-white text-[9px] px-1.5 py-0.5 rounded font-mono flex items-center space-x-1">
                        <Camera className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Fotodokumentace OK</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="border-t border-slate-200 pt-2.5 mt-3 flex items-center justify-between gap-1 text-[10px]">
                  {/* Photo Documentation Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowQrPhotoModal(label);
                      setQrPhotoPreview('');
                      startCamera('environment');
                    }}
                    className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center space-x-1 transition-colors"
                  >
                    <Camera className="w-3 h-3" />
                    <span>{label.installationPhotoUrl ? 'Přefotit' : 'Vyfotit montáž'}</span>
                  </button>

                  {/* Report Collision for this Tag */}
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(`Kolize u prvku ${label.tag} (${label.componentType})`);
                      setLocation(`${label.floor}, větev ${label.systemBranch}, pozice ${label.positionNumber}`);
                      setDescription(`Při montáži prvku ${label.tag} [${label.dimensions}] došlo k prostorové kolizi...`);
                      setShowAddCollisionModal(true);
                      setCapturedPhotoUrl('');
                    }}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center space-x-1 transition-colors"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Kolize</span>
                  </button>

                  {/* Print Button */}
                  <button
                    onClick={() => onPrintQrLabel(label.id)}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center space-x-1"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Tisk</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LIVE CAMERA SNAPPER (VYFOTIT & POSLAT)                            */}
      {/* ========================================================================= */}
      {showLiveCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-rose-400" />
                  <span>Fotoaparát stavby — Záznam kolize</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setShowLiveCameraModal(false);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewfinder */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[360px] max-h-[480px] overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                  <div className="text-sm font-bold text-white">{cameraError}</div>
                  <p className="text-xs text-slate-400">Vyberte fotografii přímo ze souborů nebo galerie telefonu.</p>
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Vybrat foto z galerie / fotoaparátu</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={e => handleFileUpload(e, 'COLLISION')}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />

                  {/* Viewfinder crosshairs HUD */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-48 border-2 border-dashed border-cyan-400/50 rounded-2xl flex items-center justify-center">
                      <span className="text-[11px] font-mono text-cyan-300/80 bg-slate-950/70 px-2 py-0.5 rounded">
                        Zaměřte kolizní místo VZT
                      </span>
                    </div>
                  </div>

                  {/* Stamp Info overlay preview */}
                  <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-mono text-slate-300 pointer-events-none">
                    <span>📍 GPS + Časové razítko bude automaticky vloženo</span>
                  </div>
                </>
              )}
            </div>

            {/* Camera Controls Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              {/* Toggle Front/Back Camera */}
              <button
                type="button"
                onClick={() => {
                  const newFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
                  setCameraFacingMode(newFacing);
                  startCamera(newFacing);
                }}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                title="Přepnout přední / zadní kameru"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2">
                {/* AI Instant Snap Trigger */}
                <button
                  type="button"
                  onClick={() => capturePhoto('COLLISION', true)}
                  className="px-5 py-3.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-xs shadow-xl shadow-purple-600/40 flex items-center space-x-2 active:scale-95 transition-all border-2 border-white/40"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>VYFOTIT & AI ANALÝZA</span>
                </button>

                {/* Standard Snap Trigger */}
                <button
                  type="button"
                  onClick={() => capturePhoto('COLLISION', false)}
                  className="px-4 py-3.5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 text-white font-bold text-xs shadow-xl shadow-rose-500/30 flex items-center space-x-1.5 active:scale-95 transition-all border border-white/20"
                >
                  <Camera className="w-4 h-4" />
                  <span>Jen vyfotit</span>
                </button>
              </div>

              {/* Alternative File Upload */}
              <label
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                title="Nahrát z galerie"
              >
                <Upload className="w-5 h-5 text-cyan-400" />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={e => handleFileUpload(e, 'COLLISION', true)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / DISPATCH COLLISION FORM                                     */}
      {/* ========================================================================= */}
      {showAddCollisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-4 text-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <span>Záznam & Odeslání Stavební Kolize</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vyfotografujte kolizi, Gemini AI rozpozná dotčené profese a vygeneruje štítek kolize.
                </p>
              </div>
              <button
                onClick={() => setShowAddCollisionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAndSendCollision} className="space-y-4">
              {/* Photo Preview or Camera Button */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                    <Camera className="w-4 h-4 text-rose-400" />
                    <span>Fotodokumentace kolizního místa</span>
                  </label>
                  {capturedPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setCapturedPhotoUrl('');
                        setAiAnalysisResult(null);
                      }}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Odebrat foto
                    </button>
                  )}
                </div>

                {capturedPhotoUrl ? (
                  <div className="space-y-2.5">
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-700">
                      <img src={capturedPhotoUrl} alt="Captured" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={handleQuickCameraOpen}
                        className="absolute bottom-2 right-2 px-3 py-1 bg-slate-900/90 text-white rounded-lg text-xs font-bold border border-slate-700 hover:bg-slate-800 flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Přefotit</span>
                      </button>
                    </div>

                    {/* Gemini AI Vision Analysis Box */}
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-800/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-purple-300">
                          <Bot className="w-4 h-4 text-cyan-400" />
                          <span>Gemini AI Vision Analýza</span>
                        </div>
                        <button
                          type="button"
                          disabled={isAnalyzingImage}
                          onClick={() => analyzeCollisionPhotoWithGemini()}
                          className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center space-x-1 disabled:opacity-50 transition-all shadow-sm"
                        >
                          <Sparkles className={`w-3 h-3 ${isAnalyzingImage ? 'animate-spin' : ''}`} />
                          <span>{isAnalyzingImage ? 'Analyzuji...' : aiAnalysisResult ? 'Přeanalyzovat' : 'Spustit AI Analýzu'}</span>
                        </button>
                      </div>

                      {/* Loading Progress State */}
                      {isAnalyzingImage && (
                        <div className="p-3 rounded-lg bg-slate-900/80 border border-purple-500/30 text-xs space-y-1.5">
                          <div className="flex items-center space-x-2 text-cyan-300 font-medium">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{analyzingProgressStep || 'Zpracovávám fotografii...'}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 h-full w-4/5 animate-pulse rounded-full" />
                          </div>
                        </div>
                      )}

                      {/* Error state */}
                      {aiAnalysisError && !isAnalyzingImage && (
                        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{aiAnalysisError}</span>
                        </div>
                      )}

                      {/* Analysis Results Display */}
                      {aiAnalysisResult && !isAnalyzingImage && (
                        <div className="space-y-2 pt-1">
                          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/80 border border-purple-900/60">
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-slate-400 font-mono">ŠTÍTEK KOLIZE:</span>
                              <span className="px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 border border-purple-600 font-mono font-bold text-xs">
                                🏷️ {aiAnalysisResult.collisionTag}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                              <span>Spolehlivost:</span>
                              <span className="text-emerald-400 font-mono font-bold">
                                {Math.round((aiAnalysisResult.confidenceScore || 0.95) * 100)}%
                              </span>
                            </div>
                          </div>

                          {/* Identified Objects Chips */}
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-slate-300 flex items-center space-x-1">
                              <span>Identifikované objekty a trasy:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {aiAnalysisResult.detectedObjects?.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-800/80 text-[10px] font-mono text-cyan-300 flex items-center space-x-1"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                  <span>{item}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Suggested Trade & Action Button */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="text-[11px] text-slate-300">
                              Navrženo: <strong className="text-white">{aiAnalysisResult.conflictingTrade}</strong> •{' '}
                              <strong className="text-rose-400">{aiAnalysisResult.severity}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={applyAiSuggestionsToForm}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Vložit návrh AI do formuláře</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleQuickCameraOpen}
                      className="py-3 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center space-x-2 transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Spustit fotoaparát</span>
                    </button>
                    <label className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-all">
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span>Nahrát z galerie (AI)</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={e => handleFileUpload(e, 'COLLISION', true)}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Project & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stavba / Projekt</label>
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Přesná lokalizace na stavbě</label>
                  <div className="flex space-x-1.5">
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      required
                      placeholder="např. 2.NP u šachty V1 / Osa C12"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={handleGetGps}
                      disabled={isGettingGps}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs border border-slate-700"
                      title="Získat GPS souřadnice"
                    >
                      <Navigation className={`w-4 h-4 ${isGettingGps ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {gpsCoordinates && (
                    <div className="text-[10px] text-emerald-400 font-mono mt-1">📍 {gpsCoordinates}</div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Název / Předmět kolize</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder="Křížení 4HR potrubí 800x400 s kanalizací DN110"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              {/* Severity & Conflicting Trade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Závažnost kolize</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono font-bold"
                  >
                    <option value="LOW">🟢 NÍZKÁ (Lokální úprava)</option>
                    <option value="MEDIUM">🟡 STŘEDNÍ (Nutno vyhnout)</option>
                    <option value="HIGH">🟠 VYSOKÁ (Blokuje trasu)</option>
                    <option value="CRITICAL">🔴 KRITICKÁ (Zastavení montáže)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Konfliktní profese</label>
                  <select
                    value={conflictingTrade}
                    onChange={e => setConflictingTrade(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  >
                    <option value="ZTI">ZTI (Voda / Kanalizace)</option>
                    <option value="ELEKTRO">Elektro (Kabelové lávky)</option>
                    <option value="STATIKA">Statika (ŽB průvlak / sloup)</option>
                    <option value="CHLAZENI">Chlazení (VRV potrubí)</option>
                    <option value="ARCHITEKTURA">Architektura / Podhledy</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Popis problému na stavbě</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  placeholder="Potrubí nelze osadit v projektované výšce 2800 mm kvůli křížení s ležatým svodem kanalizace..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              {/* Proposed Solution */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Navržené řešení pro dílnu / montáž (nepovinné)</label>
                <input
                  type="text"
                  value={resolutionNote}
                  onChange={e => setResolutionNote(e.target.value)}
                  placeholder="Použít sníženou přechodku 1000x300 nebo etážku e=250 mm"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              {/* Multi-channel Dispatching Checkboxes */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Send className="w-3.5 h-3.5" />
                  <span>Kanály pro odeslání hlášení</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendViaSystem}
                      onChange={e => setSendViaSystem(e.target.checked)}
                      className="accent-cyan-400"
                    />
                    <span className="text-slate-200 font-semibold">Stavební systém</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendViaEmail}
                      onChange={e => setSendViaEmail(e.target.checked)}
                      className="accent-cyan-400"
                    />
                    <span className="text-slate-200 font-semibold">E-mail (BIM/TDI)</span>
                  </label>

                  <label className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendViaWhatsApp}
                      onChange={e => setSendViaWhatsApp(e.target.checked)}
                      className="accent-emerald-400"
                    />
                    <span className="text-emerald-400 font-semibold">WhatsApp chat</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCollisionModal(false)}
                  className="px-4 py-2.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/30 flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>ULOŽIT & ODESLAT HLÁŠENÍ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: QR INSTALLATION PHOTO CAPTURE                                     */}
      {/* ========================================================================= */}
      {showQrPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <span>Fotodokumentace montáže: {showQrPhotoModal.tag}</span>
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  {showQrPhotoModal.componentType} • {showQrPhotoModal.dimensions} ({showQrPhotoModal.floor})
                </div>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setShowQrPhotoModal(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Camera Viewfinder or Preview */}
            <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center">
              {qrPhotoPreview ? (
                <img src={qrPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {qrPhotoPreview ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setQrPhotoPreview('');
                      startCamera('environment');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Přefotit</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveQrInstallationPhoto}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/30"
                  >
                    <Check className="w-4 h-4" />
                    <span>Potvrdit & odeslat fotodokumentaci</span>
                  </button>
                </>
              ) : (
                <>
                  <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 cursor-pointer">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Nahrát foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={e => handleFileUpload(e, 'QR_LABEL')}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => capturePhoto('QR_LABEL')}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center space-x-2 shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                    <span>VYFOTIT NAMONTOVANÝ DÍL</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: QR SCANNER (CAMERA OR TAG LOOKUP)                                 */}
      {/* ========================================================================= */}
      {showQrScannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Scan className="w-5 h-5 text-cyan-400" />
                <span>Čtečka QR Štítků VZT</span>
              </h3>
              <button
                onClick={() => {
                  setShowQrScannerModal(false);
                  setScannedLabel(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Tag Selector / Simulator */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Zvolte nebo naskenujte QR kód dílu:</label>
              <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950 rounded-xl border border-slate-800">
                {qrLabels.map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setScannedLabel(l)}
                    className={`p-2 rounded-lg text-[11px] font-mono font-bold border transition-all text-left truncate ${
                      scannedLabel?.id === l.id
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {l.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Scanned Tag Info Card */}
            {scannedLabel ? (
              <div className="p-4 bg-slate-950 rounded-2xl border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-mono uppercase font-bold">Nalezený VZT díl</span>
                    <div className="text-base font-black text-white font-mono">{scannedLabel.tag}</div>
                  </div>
                  <div className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono font-bold text-slate-300">
                    {scannedLabel.positionNumber}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Typ:</span>
                    <strong className="text-slate-200">{scannedLabel.componentType}</strong>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Rozměry:</span>
                    <strong className="text-cyan-300">{scannedLabel.dimensions}</strong>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Patro / Větev:</span>
                    <strong className="text-slate-200">{scannedLabel.floor} • {scannedLabel.systemBranch}</strong>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Status:</span>
                    <strong className={scannedLabel.installationStatus === 'INSTALLED' ? 'text-emerald-400' : 'text-amber-400'}>
                      {scannedLabel.installationStatus || 'Ve výrobě'}
                    </strong>
                  </div>
                </div>

                {/* Instant Actions for Scanned Label */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQrScannerModal(false);
                      setShowQrPhotoModal(scannedLabel);
                      setQrPhotoPreview('');
                      startCamera('environment');
                    }}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Vyfotit montáž</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowQrScannerModal(false);
                      setTitle(`Kolize u dílu ${scannedLabel.tag}`);
                      setLocation(`${scannedLabel.floor}, ${scannedLabel.systemBranch}, pozice ${scannedLabel.positionNumber}`);
                      setDescription(`Při montáži prvku ${scannedLabel.tag} (${scannedLabel.dimensions}) nastala kolize...`);
                      setShowAddCollisionModal(true);
                      setCapturedPhotoUrl('');
                    }}
                    className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Nahlásit kolizi</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-950 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                Klikněte na libovolný tag výše pro zobrazení parametrů dílu a rychlých akcí.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSPECT GEMINI AI COLLISION ANALYSIS                              */}
      {/* ========================================================================= */}
      {selectedCollisionAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-purple-800/80 rounded-3xl w-full max-w-2xl shadow-2xl p-6 space-y-4 text-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-700 text-purple-300">
                  <Bot className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Gemini AI Analýza Kolize</span>
                    {selectedCollisionAiModal.collisionTag && (
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-900/80 text-purple-200 border border-purple-600">
                        🏷️ {selectedCollisionAiModal.collisionTag}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedCollisionAiModal.title} • {selectedCollisionAiModal.projectName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCollisionAiModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo & Detected Objects Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedCollisionAiModal.photoUrl && (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                  <img
                    src={selectedCollisionAiModal.photoUrl}
                    alt="Collision"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-cyan-300 border border-slate-700">
                    Multimodální AI scan
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">
                    Rozpoznané stavební prvky
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCollisionAiModal.aiAnalysis?.detectedObjects?.map((obj, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800 text-xs font-mono text-cyan-200 flex items-center space-x-1.5"
                      >
                        <Bot className="w-3 h-3 text-cyan-400" />
                        <span>{obj}</span>
                      </span>
                    )) || (
                      <span className="text-xs text-slate-500">Žádné prvky nebyly zaznamenány</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Střet s profesí:</span>
                    <strong className="text-cyan-300 font-bold">
                      {selectedCollisionAiModal.aiAnalysis?.conflictingTrade || selectedCollisionAiModal.conflictingTrade}
                    </strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Závažnost kolize:</span>
                    <strong className="text-rose-400 font-bold">
                      {selectedCollisionAiModal.aiAnalysis?.severity || selectedCollisionAiModal.severity}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Findings & Resolution Description */}
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>Detailní popis prostorové kolize</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedCollisionAiModal.aiAnalysis?.description || selectedCollisionAiModal.description}
                </p>
              </div>

              {(selectedCollisionAiModal.aiAnalysis?.resolutionNote || selectedCollisionAiModal.resolutionNote) && (
                <div className="p-3.5 bg-emerald-950/30 rounded-2xl border border-emerald-900/50 space-y-1.5">
                  <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span>Doporučený technický postup řešení</span>
                  </div>
                  <p className="text-xs text-emerald-200 leading-relaxed">
                    {selectedCollisionAiModal.aiAnalysis?.resolutionNote || selectedCollisionAiModal.resolutionNote}
                  </p>
                </div>
              )}

              {selectedCollisionAiModal.aiAnalysis?.complianceNotes && (
                <div className="p-3 bg-purple-950/30 rounded-2xl border border-purple-900/40 text-xs text-purple-300 flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-purple-200">Relevantní normy ČSN a bezpečnostní předpisy:</strong>
                    <span>{selectedCollisionAiModal.aiAnalysis.complianceNotes}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <div className="text-[11px] text-slate-400 font-mono">
                Analyzováno modelem Gemini AI Vision • Spolehlivost {Math.round((selectedCollisionAiModal.aiAnalysis?.confidenceScore || 0.95) * 100)}%
              </div>
              <button
                type="button"
                onClick={() => setSelectedCollisionAiModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PHOTO LIGHTBOX (FULL-SCREEN EXPANDED PHOTO)                       */}
      {/* ========================================================================= */}
      {selectedPhotoLightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedPhotoLightbox.title}</h3>
                {selectedPhotoLightbox.subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5">{selectedPhotoLightbox.subtitle}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={selectedPhotoLightbox.url}
                  download="vzt-kolize-foto.jpg"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400"
                  title="Stáhnout fotografii"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setSelectedPhotoLightbox(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black">
              <img
                src={selectedPhotoLightbox.url}
                alt="Enlarged view"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
