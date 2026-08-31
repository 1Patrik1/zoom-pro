import React from 'react';
import {
  LayoutDashboard,
  Clock,
  Building2,
  Layers,
  FileText,
  CreditCard,
  Boxes,
  FileCheck,
  PenTool,
  Download,
  Users,
  Settings,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  Receipt,
  ShieldAlert,
  Printer,
  Stethoscope,
} from 'lucide-react';

export type NavTab =
  | 'prehled'
  | 'dochazka'
  | 'projekty'
  | 'kalkulacka'
  | 'denik'
  | 'faktury'
  | 'monteri'
  | 'distribuce'
  | 'sklad'
  | 'kolize'
  | 'ai'
  | 'dokumenty'
  | 'podpisy'
  | 'exporty'
  | 'tisk'
  | 'doctor'
  | 'saas'
  | 'tym'
  | 'nastaveni';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const navItems: {
  id: NavTab;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'prehled', label: 'Přehled & Analytics', icon: LayoutDashboard },
  { id: 'dochazka', label: 'Docházka (GPS)', icon: Clock },
  { id: 'projekty', label: 'Stavby & Fotochat', icon: Building2 },
  { id: 'kalkulacka', label: '3D TZB Kalkulátor', badge: 'VZT/Voda/ÚT', icon: Layers },
  { id: 'denik', label: 'Stavební deník', icon: FileText },
  { id: 'faktury', label: 'Faktury & QR', icon: CreditCard },
  { id: 'monteri', label: 'Faktury pro montéry', badge: 'SPAYD QR', icon: Receipt },
  { id: 'distribuce', label: 'B2B Distribuce & Nákup', badge: '5 tabů', icon: ShoppingBag },
  { id: 'sklad', label: 'Sklad & Zásoby', icon: Boxes },
  { id: 'kolize', label: 'Kolize & QR Štítky', badge: 'VZT', icon: AlertTriangle },
  { id: 'ai', label: 'AI Vision & Asistent', badge: 'AI', icon: Sparkles },
  { id: 'dokumenty', label: 'Protokoly & Zkoušky', icon: FileCheck },
  { id: 'podpisy', label: 'e-Podpisy (SHA-256)', icon: PenTool },
  { id: 'exporty', label: 'Importy & ISDOC', icon: Download },
  { id: 'tisk', label: 'Tisk & Sestavy', badge: 'Print', icon: Printer },
  { id: 'doctor', label: 'Doctor & Diagnostika', badge: '100% OK', icon: Stethoscope },
  { id: 'saas', label: 'SaaS & Licence', badge: 'Admin', icon: ShieldAlert },
  { id: 'tym', label: 'Tým & Oprávnění', icon: Users },
  { id: 'nastaveni', label: 'Master Nastavení', icon: Settings },
];

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="bg-slate-950/80 border-b border-slate-800/80 px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar">
      <div className="flex items-center space-x-1.5 min-w-max">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                    item.badge === 'AI'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : item.badge === 'Admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
