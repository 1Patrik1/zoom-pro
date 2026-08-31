import React, { useState } from 'react';
import {
  Globe,
  ShieldCheck,
  Server,
  Terminal,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Cpu,
  RefreshCw,
  Zap,
  Lock,
  Radio,
  Cloud,
} from 'lucide-react';

interface CloudflareTunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudflareTunnelModal: React.FC<CloudflareTunnelModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [domainName, setDomainName] = useState('app.zoompro-vzt.cz');
  const [tunnelMode, setTunnelMode] = useState<'MANAGED_DASHBOARD' | 'CLI_SERVICE' | 'DOCKER_PROD'>('MANAGED_DASHBOARD');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const cloudflaredConfigYaml = `# /etc/cloudflared/config.yml nebo C:\\cloudflared\\config.yml
tunnel: 8a45b1c9-72f1-48d0-992e-zoomproapp01
credentials-file: /etc/cloudflared/8a45b1c9-72f1-48d0-992e-zoomproapp01.json

ingress:
  # Směrování na Zoom Pro lokální / container server (port 3000 / 5000)
  - hostname: ${domainName}
    service: http://localhost:3000
  - hostname: api.${domainName}
    service: http://localhost:3000
  # Fallback 404
  - service: http_status:404
`;

  const dockerComposeProdYaml = `# docker-compose.prod.yml
version: '3.8'

services:
  # Databáze PostgreSQL s persistentním diskem
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: vzt_system
      POSTGRES_USER: vzt_user
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-vzt_pass_prod_2026}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - zoom-internal

  # Backend + Frontend Zoom Pro
  zoom-app:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://vzt_user:\${POSTGRES_PASSWORD:-vzt_pass_prod_2026}@postgres:5432/vzt_system
      JWT_SECRET: \${JWT_SECRET:-kryptograficky_velmi_silny_secret_2026}
      CORS_ORIGIN: https://${domainName},capacitor://localhost,https://localhost
    depends_on:
      - postgres
    networks:
      - zoom-internal

  # Cloudflare Tunnel Daemon (Běží nonstop v cloudu bez nutnosti veřejné IP či otevírání portů)
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: always
    command: tunnel run --token \${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - zoom-app
    networks:
      - zoom-internal

volumes:
  pgdata:

networks:
  zoom-internal:
    driver: bridge
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-white">
                  Cloudflare Zero Trust Tunnel — 24/7 Always-On
                </h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded font-bold">
                  HTTPS Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Nonstop přístup z mobilu odkudkoliv bez nutnosti mít zapnutý počítač nebo veřejnou IP
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all"
          >
            ✕
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs">
          
          {/* Key Advantages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                <Zap className="w-4 h-4" />
                <span>100% Nezávislé</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Aplikace běží na VPS / Cloudu v Dockeru. Žádné zařízení nemusí zůstat spuštěné.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
                <Lock className="w-4 h-4" />
                <span>Automatické SSL</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Cloudflare zajišťuje globální HTTPS šifrování a ochranu před DDoS útoky.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                <Radio className="w-4 h-4" />
                <span>Mobilní PWA & APK</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Montéři na stavbách mají okamžitý přístup i při výpadku signálu díky offline queue.
              </p>
            </div>
          </div>

          {/* Deployment Method Selector */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-bold text-xs uppercase tracking-wider">
              Zvolte způsob nasazení Cloudflare Tunelu:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTunnelMode('MANAGED_DASHBOARD')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tunnelMode === 'MANAGED_DASHBOARD'
                    ? 'bg-amber-500/15 border-amber-500 text-white font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-amber-400">1. Cloudflare Dashboard</div>
                <div className="text-[10px] text-slate-500">Nejjednodušší (1 klik token)</div>
              </button>

              <button
                type="button"
                onClick={() => setTunnelMode('DOCKER_PROD')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tunnelMode === 'DOCKER_PROD'
                    ? 'bg-amber-500/15 border-amber-500 text-white font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-cyan-400">2. Docker VPS Production</div>
                <div className="text-[10px] text-slate-500">Hetzner / DigitalOcean VPS</div>
              </button>

              <button
                type="button"
                onClick={() => setTunnelMode('CLI_SERVICE')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  tunnelMode === 'CLI_SERVICE'
                    ? 'bg-amber-500/15 border-amber-500 text-white font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-emerald-400">3. Windows / Linux Service</div>
                <div className="text-[10px] text-slate-500">Běh jako systémová služba</div>
              </button>
            </div>
          </div>

          {/* Domain input */}
          <div>
            <label className="block text-slate-400 mb-1">Cílová doména vaší firmy:</label>
            <input
              type="text"
              value={domainName}
              onChange={e => setDomainName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
              placeholder="vzt.mojefirma.cz"
            />
          </div>

          {/* MODE 1: MANAGED DASHBOARD */}
          {tunnelMode === 'MANAGED_DASHBOARD' && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-slate-200 flex items-center space-x-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <span>Postup vytvoření v Cloudflare Zero Trust (3 kroky):</span>
              </h4>
              <ol className="list-decimal pl-5 space-y-2 text-slate-300 leading-relaxed">
                <li>
                  Otevřete <strong>Zero Trust Dashboard</strong> na{' '}
                  <span className="text-amber-300 font-mono">dash.teams.cloudflare.com</span> → sekce <strong>Networks → Tunnels</strong>.
                </li>
                <li>
                  Klikněte na <strong>Create a Tunnel</strong> → zadejte název <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">zoom-pro-prod</code>.
                </li>
                <li>
                  V záložce <strong>Public Hostname</strong> zadejte:
                  <div className="mt-1 bg-slate-900 p-2.5 rounded-lg font-mono text-[11px] text-cyan-300 border border-slate-800">
                    Hostname: <strong>{domainName}</strong> → Type: <strong>HTTP</strong> → URL: <strong>localhost:3000</strong> (nebo 5000)
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* MODE 2: DOCKER PROD */}
          {tunnelMode === 'DOCKER_PROD' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">Produkční Docker Compose s tunelem:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(dockerComposeProdYaml, 'docker')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center space-x-1.5 transition-all"
                >
                  {copiedSection === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'docker' ? 'Zkopírováno' : 'Kopírovat Compose'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                {dockerComposeProdYaml}
              </pre>
            </div>
          )}

          {/* MODE 3: CLI SERVICE */}
          {tunnelMode === 'CLI_SERVICE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">Konfigurace cloudflared config.yml:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(cloudflaredConfigYaml, 'yaml')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center space-x-1.5 transition-all"
                >
                  {copiedSection === 'yaml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'yaml' ? 'Zkopírováno' : 'Kopírovat YAML'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                {cloudflaredConfigYaml}
              </pre>
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-slate-300 space-y-1 font-mono text-[11px]">
                <p className="text-amber-400 font-bold">Instalace jako nonstop služba na pozadí (Windows / Linux):</p>
                <p>&gt; cloudflared service install</p>
                <p>&gt; cloudflared service start</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Aplikace bude trvale dostupná na <strong className="text-slate-300 font-mono">https://{domainName}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20"
          >
            ROZUMÍM, ZAVŘÍT
          </button>
        </div>

      </div>
    </div>
  );
};
