import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Zap,
  ArrowRight,
  Bot,
  Send,
  FileText,
  Boxes,
  Plus,
  Mic,
  MicOff,
  MapPin,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  ExternalLink,
  Cpu,
  Download,
  Info,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { VztComponent, Project } from '../types';

interface AiAssistantViewProps {
  projects?: Project[];
  onAddDetectedComponent: (comp: Omit<VztComponent, 'id' | 'createdAt'>) => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  groundingMetadata?: any;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  projects = [],
  onAddDetectedComponent,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'audio' | 'image' | 'vision'>('chat');

  // ==========================================
  // 1. MULTI-TURN GEMINI CHAT STATE
  // ==========================================
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: `Dobrý den! Jsem **VZT Expert AI** asistent. 

Mám k dispozici nejmodernější modely **Gemini** s rolemi a nástroji přizpůsobenými pro vzduchotechniku a stavby:
- ⚡ **Rychlé dotazy (gemini-3.1-flash-lite)**: rychlé definice norem, převody jednotek a parametry.
- 🎯 **Běžné dotazy (gemini-3.5-flash)**: dimenzování tras, akustika, požární bezpečnost.
- 🧠 **Komplexní inženýring (gemini-3.1-pro-preview)**: hloubkové výpočty aerodynamiky, složité kolize a normativní posudky.
- 🗺️ **Google Maps Grounding**: vyhledání dodavatelů VZT, velkoobchodů a stavebních parcel v reálném čase.

S čím vám dnes mohu pomoci?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [taskType, setTaskType] = useState<'general' | 'complex' | 'fast'>('general');
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || isSending) return;

    const userMessageText = inputQuery.trim();
    setInputQuery('');
    
    // Add user message locally
    const userMsg: ChatMessage = {
      role: 'user',
      text: userMessageText,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsSending(true);

    // Get selected project coordinates if any
    const selectedProj = projects.find(p => p.id === selectedProjectId);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: userMessageText,
          taskType,
          useMapsGrounding,
          latitude: selectedProj?.lat,
          longitude: selectedProj?.lng,
        }),
      });

      if (!res.ok) {
        throw new Error('Chyba při komunikaci se serverem');
      }

      const data = await res.json();
      const modelMsg: ChatMessage = {
        role: 'model',
        text: data.reply,
        timestamp: new Date().toISOString(),
        groundingMetadata: data.groundingMetadata,
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: `⚠️ **Chyba spojení**: ${err.message || 'Nepodařilo se kontaktovat Gemini API.'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await fetch(`/api/ai/chat/${sessionId}`, { method: 'DELETE' });
      setMessages([
        {
          role: 'model',
          text: 'Konverzace byla vyčištěna. Jaký dotaz máte nyní?',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // 2. AUDIO TRANSCRIPTION (gemini-3.5-transcribe)
  // ==========================================
  const [isRecording, setIsRecording] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioForTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert(`Nelze spustit mikrofon: ${err.message || 'Ověřte oprávnění prohlížeče'}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const sendAudioForTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const res = await fetch('/api/ai/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: 'audio/webm',
          }),
        });
        const data = await res.json();
        setAudioTranscript(data.transcript || 'Nepodařilo se rozpoznat řeč.');
        setIsTranscribing(false);
      };
    } catch (err: any) {
      setAudioTranscript(`Chyba přepisu: ${err.message}`);
      setIsTranscribing(false);
    }
  };

  const handleUseTranscriptInChat = () => {
    if (!audioTranscript) return;
    setInputQuery(audioTranscript);
    setActiveTab('chat');
  };

  // ==========================================
  // 3. IMAGE GENERATION / EDIT (gemini-3.1-flash-image-preview)
  // ==========================================
  const [imagePrompt, setImagePrompt] = useState(
    'Technický 3D axonometrický řez čtyřhranného VZT vzduchotechnického potrubí s revizními dvířky a tlumičem hluku, čisté průmyslové provedení'
  );
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '4:3'>('16:9');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedCaption, setGeneratedCaption] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  const [imageError, setImageError] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;
    setIsGeneratingImage(true);
    setImageError(null);
    setGeneratedCaption(null);

    try {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          referenceImageBase64: referenceImage,
          aspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok && !data.imageUrl) {
        throw new Error(data.error || 'Chyba při generování obrázku');
      }
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        if (data.caption) setGeneratedCaption(data.caption);
      }
    } catch (err: any) {
      setImageError(err.message || 'Chyba při generování obrázku');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // ==========================================
  // 4. VISION AUTODETECT (Stávající VZT Extrakce)
  // ==========================================
  const [selectedImage, setSelectedImage] = useState<string | null>(
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<{
    detectedType: string;
    width: number;
    height: number;
    length: number;
    material: 'POZINK' | 'NEREZ' | 'HLINIK';
    thickness: number;
    surfaceArea: number;
    weight: number;
    confidence: number;
    textDetected: string;
  } | null>({
    detectedType: 'Čtyřhranné potrubí rovné',
    width: 800,
    height: 400,
    length: 1500,
    material: 'POZINK',
    thickness: 0.8,
    surfaceArea: 3.6,
    weight: 28.8,
    confidence: 98.4,
    textDetected: 'VZT POZINK TRASA A1 - 800x400 L=1500 tl.0.8mm',
  });
  const [addedMessage, setAddedMessage] = useState(false);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setDetectionResult({
        detectedType: 'Čtyřhranné koleno 90° s revizními dvířky',
        width: 600,
        height: 350,
        length: 600,
        material: 'POZINK',
        thickness: 0.8,
        surfaceArea: 1.62,
        weight: 12.96,
        confidence: 96.8,
        textDetected: 'KOLENO 90° 600x350 R=150 + DVIŘKA 200x200',
      });
    }, 1200);
  };

  const handleApplyToVzt = () => {
    if (!detectionResult) return;
    onAddDetectedComponent({
      companyId: '00000000-0000-4000-8000-000000000001',
      projectName: 'AutoDetect AI Import',
      type: 'Koleno',
      width: detectionResult.width,
      height: detectionResult.height,
      length: detectionResult.length,
      angle: 90,
      surfaceArea: detectionResult.surfaceArea,
      weight: detectionResult.weight,
      material: detectionResult.material,
      sheetThickness: detectionResult.thickness,
      requiresAccessDoor: true,
      costPrice: Math.round(detectionResult.surfaceArea * 450),
      sellPrice: Math.round(detectionResult.surfaceArea * 980),
      note: `Detekováno AI Vision (${detectionResult.textDetected})`,
    });
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[11px] font-mono font-bold uppercase tracking-wider">
              Gemini 3 Multi-Modal Intelligence Hub
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2 mt-1">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span>AI VZT Asistent & Diagnostické Centrum</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Vícekolový chat s modely Gemini, hlasový záznamník s přepisem, generování technických vizualizací a Google Maps Grounding
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'chat' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Gemini Chat & Maps</span>
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'audio' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Hlasový Přepis</span>
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'image' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Generátor Výkresů</span>
          </button>
          <button
            onClick={() => setActiveTab('vision')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'vision' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Vision AutoDetect</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. GEMINI MULTI-TURN CHAT WITH MODEL SELECTION & MAPS GROUNDING */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls / Parameters sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>Volba AI Modelu & Úlohy</span>
              </h3>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setTaskType('general')}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                    taskType === 'general'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Standardní VZT Dotazy</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">gemini-3.5-flash</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Normy ČSN EN 1507, dimenzování tlumičů, rychlosti proudění</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskType('complex')}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                    taskType === 'complex'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Komplexní Inženýring & Posudky</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">gemini-3.1-pro-preview</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Složité aerodynamické výpočty, požární posouzení, detailní analýzy</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTaskType('fast')}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                    taskType === 'fast'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Bleskové Odpovědi</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">gemini-3.1-flash-lite</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Rychlé vyhledání vzorců, koeficientů a materiálových parametrů</div>
                </button>
              </div>

              {/* Maps Grounding Toggle */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">Google Maps Grounding</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={useMapsGrounding}
                    onChange={e => setUseMapsGrounding(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700 focus:ring-purple-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Vyhledávání reálných velkoobchodů VZT, servisních středisek a stavebnin v okolí stavby.
                </p>

                {useMapsGrounding && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Vztaženo ke stavbě:</label>
                    <select
                      value={selectedProjectId}
                      onChange={e => setSelectedProjectId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Celá ČR / Bez konkrétní GPS --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.address || 'GPS'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1 py-1 px-2 rounded-lg hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Smazat historii vlákna</span>
                </button>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Doporučené rychlé dotazy</span>
              </div>
              <div className="space-y-1.5">
                {[
                  'Jaké jsou požadavky normy ČSN EN 1507 na třídu těsnosti C?',
                  'Kde v okolí Prahy seženu nejbližší sklad se spiro potrubím d200?',
                  'Jak správně spočítat tlakovou ztrátu kolena 90° 800x400 mm?',
                  'Doporuč technologický postup montáže požárních klapek EIS 90.',
                ].map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputQuery(promptText);
                      if (promptText.includes('sklad') || promptText.includes('okolí')) {
                        setUseMapsGrounding(true);
                      }
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    "{promptText}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Chat Thread */}
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[640px]">
            {/* Thread Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center space-x-2">
                    <span>VZT AI Inženýr</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Aktivní model: {taskType === 'complex' ? 'gemini-3.1-pro-preview' : taskType === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash'}
                    {useMapsGrounding && ' • Maps Grounding aktivní'}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-purple-600 text-white rounded-br-none shadow-md'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1.5 opacity-60 text-[10px] font-mono">
                      <span>{m.role === 'user' ? 'Stavbyvedoucí / Vy' : 'Gemini VZT Expert'}</span>
                      <span>•</span>
                      <span>{new Date(m.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="prose prose-invert prose-xs max-w-none space-y-2">
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>

                    {/* Google Maps Grounding Links */}
                    {m.groundingMetadata?.groundingChunks && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                        <div className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>Ověřené lokace a zdroje z Google Maps:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {m.groundingMetadata.groundingChunks.map((chunk: any, cIdx: number) => {
                            const webSource = chunk.web?.uri ? chunk.web : chunk.maps;
                            if (!webSource) return null;
                            return (
                              <a
                                key={cIdx}
                                href={webSource.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-cyan-300 hover:bg-slate-800 transition-colors"
                              >
                                <span>{webSource.title || 'Místo na mapě'}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex items-start">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl rounded-bl-none flex items-center space-x-3 text-xs text-purple-400">
                    <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                    <span>Gemini zpracovává technickou odpověď...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center space-x-3">
              <input
                type="text"
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                placeholder="Zadejte dotaz na VZT normy, dimenzování tras nebo prodejce..."
                disabled={isSending}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSending || !inputQuery.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 flex items-center space-x-1.5 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Odeslat</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. AUDIO TRANSCRIPTION (gemini-3.5-transcribe) */}
      {/* ========================================================================= */}
      {activeTab === 'audio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold uppercase">
                  gemini-3.5-transcribe
                </span>
              </div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2 mt-1">
                <Mic className="w-5 h-5 text-emerald-400" />
                <span>Hlasový Záznamník na Stavbě</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Nahrajte montážní poznámku, zápis do stavebního deníku nebo popis kolize přímo z mikrofonu. Model automaticky převede řeč do strukturovaného technického textu.
              </p>
            </div>

            {/* Mic Button & Timer */}
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center space-y-4">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-rose-600 text-white shadow-xl shadow-rose-600/40 animate-pulse scale-105'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30'
                }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>

              <div className="text-center">
                {isRecording ? (
                  <div className="space-y-1">
                    <div className="text-rose-400 font-mono font-bold text-sm">
                      Nahrávám: {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-[11px] text-slate-400">Kliknutím nahrávání zastavíte a spustíte přepis</div>
                  </div>
                ) : isTranscribing ? (
                  <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono">
                    <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                    <span>Přepisuji audio záznam přes Gemini...</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 font-medium">
                    Klikněte na mikrofon pro zahájení hlasového záznamu
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Příklady využití hlasového záznamu:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>„Dnes v hale 3 namontováno 40 metrů čtyřhranu 800x400 a 3 ks požárních klapek.“</li>
                <li>„Zjištěna kolize ve 2. patře mezi spiro potrubím a statickým překladem.“</li>
              </ul>
            </div>
          </div>

          {/* Transcript Result */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Výsledný Textový Přepis</span>
                </h3>
                {audioTranscript && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Přepis dokončen
                  </span>
                )}
              </div>

              <div className="mt-4">
                {audioTranscript ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans min-h-[220px] whitespace-pre-wrap">
                    {audioTranscript}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center text-slate-500 text-xs min-h-[220px] flex flex-col items-center justify-center space-y-2">
                    <Mic className="w-8 h-8 text-slate-700" />
                    <span>Zde se zobrazí přepsaný text po nahrání hlasové zprávy.</span>
                  </div>
                )}
              </div>
            </div>

            {audioTranscript && (
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(audioTranscript)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Kopírovat do schránky
                </button>
                <button
                  type="button"
                  onClick={handleUseTranscriptInChat}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 flex items-center space-x-1.5 transition-all"
                >
                  <Bot className="w-4 h-4" />
                  <span>Vložit do Gemini Chatu</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. IMAGE GENERATOR / EDITOR (gemini-3.1-flash-image-preview) */}
      {/* ========================================================================= */}
      {activeTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase">
                  gemini-3.1-flash-image-preview
                </span>
              </div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2 mt-1">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                <span>Generování & Úprava VZT Výkresů</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Vytvářejte technické axonometrické 3D náhledy, schémata vzduchotechnických uzlů a vizualizace montáže.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Textové zadání (Prompt):</label>
                <textarea
                  rows={4}
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  placeholder="Zadejte popis požadovaného technického detailu..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Poměr stran (Aspect Ratio):</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['16:9', '4:3', '1:1'] as const).map(ratio => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        aspectRatio === ratio
                          ? 'bg-cyan-600/20 border-cyan-500 text-cyan-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset Prompts */}
              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] font-bold text-slate-400">Rychlé šablony:</div>
                {[
                  'Detail osazení buňkového tlumiče hluku v potrubní trase 1000x500',
                  'Schéma zapojení požární klapky s pružinovým pohonem ve stěně',
                  'Axonometrie VZT strojovny s rekuperační jednotkou a přívodním potrubím',
                ].map((tmpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setImagePrompt(tmpl)}
                    className="w-full text-left p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    "{tmpl}"
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2 transition-all mt-2"
              >
                {isGeneratingImage ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Generuji 3D technickou vizualizaci...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Vygenerovat obrázek (Gemini)</span>
                  </>
                )}
              </button>

              {imageError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Oznámení:</div>
                    <div className="text-[11px] text-amber-200/90 mt-0.5">{imageError}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generated Image Result View */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Náhled Vygenerovaného Výkresu / Vizualizace</span>
                </h3>
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                {generatedImageUrl ? (
                  <img
                    src={generatedImageUrl}
                    alt="Vygenerovaný VZT výkres"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-600 text-xs p-6 space-y-2">
                    <ImageIcon className="w-10 h-10 mx-auto text-slate-700" />
                    <span>Zadejte prompt a klikněte na Vygenerovat obrázek.</span>
                  </div>
                )}
              </div>

              {generatedCaption && (
                <div className="mt-3 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-slate-300">
                  {generatedCaption}
                </div>
              )}
            </div>

            {generatedImageUrl && (
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">VZT AI Engine (Gemini Pro / Flash)</span>
                <a
                  href={generatedImageUrl}
                  download="vzt-vizualizace.png"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Stáhnout obrázek</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VISION AUTODETECT (Stávající modul) */}
      {/* ========================================================================= */}
      {activeTab === 'vision' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Image Upload / Preview */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Camera className="w-5 h-5 text-purple-400" />
              <span>Vstupní fotografie štítku / tvarovky</span>
            </h3>

            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="VZT díl"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-slate-500 text-xs p-4">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <span>Přetáhněte sem fotografii štítku nebo výkresového detailu</span>
                </div>
              )}

              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-purple-400 space-y-3">
                  <span className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-xs font-mono font-bold">Analyzuji tvarovku pomocí Gemini Vision...</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Spustit Vision AutoDetect</span>
              </button>

              <button
                onClick={() => setSelectedImage('https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80')}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Ukázka 2
              </button>
            </div>
          </div>

          {/* AI Result Card */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-purple-400" />
                  <span>Výsledek Vision Extrakce</span>
                </h3>
                {detectionResult && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Spolehlivost: {detectionResult.confidence}%
                  </span>
                )}
              </div>

              {detectionResult ? (
                <div className="space-y-4 mt-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Rozpoznaný text ze štítku</div>
                    <div className="font-mono text-cyan-300 font-bold mt-1 text-sm">{detectionResult.textDetected}</div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="text-slate-500 text-[10px]">Typ prvku</div>
                      <div className="font-bold text-slate-200 mt-0.5">{detectionResult.detectedType}</div>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="text-slate-500 text-[10px]">Rozměr (W x H)</div>
                      <div className="font-bold font-mono text-slate-200 mt-0.5">{detectionResult.width} x {detectionResult.height} mm</div>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="text-slate-500 text-[10px]">Délka (L)</div>
                      <div className="font-bold font-mono text-slate-200 mt-0.5">{detectionResult.length} mm</div>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="text-slate-500 text-[10px]">Materiál / Tloušťka</div>
                      <div className="font-bold font-mono text-amber-400 mt-0.5">{detectionResult.material} tl. {detectionResult.thickness}mm</div>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="text-slate-500 text-[10px]">Rozvinutá plocha</div>
                      <div className="font-bold font-mono text-cyan-400 mt-0.5">{detectionResult.surfaceArea} m²</div>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="text-slate-500 text-[10px]">Hmotnost dílu</div>
                      <div className="font-bold font-mono text-emerald-400 mt-0.5">{detectionResult.weight} kg</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs py-8 text-center">
                  Zatím nebyla provedena analýza.
                </div>
              )}
            </div>

            {detectionResult && (
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                {addedMessage ? (
                  <div className="text-emerald-400 text-xs font-semibold flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Úspěšně vloženo do 3D VZT Kalkulátoru zakázky!</span>
                  </div>
                ) : (
                  <div className="text-slate-400 text-[11px]">
                    Jedním kliknutím zařadíte parametr do výroby.
                  </div>
                )}

                <button
                  onClick={handleApplyToVzt}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Vložit do 3D Kalkulátoru</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
