import React from 'react';
import {
  ShieldCheck,
  User,
  Wifi,
  MapPin,
  Clock,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { User as UserType, UserRole } from '../types';

interface HeaderProps {
  currentUser: UserType;
  onSwitchRole: (role: UserRole) => void;
  onOpenQuickAttendance: () => void;
  onOpenCloudflareTunnel?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchRole,
  onOpenQuickAttendance,
  onOpenCloudflareTunnel,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 font-black text-xs tracking-tight">
          ZOOM
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-black text-sm text-slate-100 tracking-tight">ZOOM-PRO</span>
            <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/50 px-1.5 py-0.2 rounded font-semibold">
              v2.0
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">HVAC & TZB Enterprise Platform</p>
        </div>
      </div>

      {/* Center GPS & Cloudflare 24/7 Status */}
      <div className="hidden md:flex items-center space-x-3 text-xs font-mono">
        <button
          type="button"
          onClick={onOpenCloudflareTunnel}
          className="flex items-center space-x-1.5 text-amber-400 bg-amber-950/40 hover:bg-amber-950/70 px-3 py-1 rounded-full border border-amber-500/30 transition-all cursor-pointer shadow-sm"
          title="Otevřít nastavení Cloudflare 24/7 Tunelu"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          <span className="font-bold">Cloudflare 24/7</span>
        </button>

        <div className="flex items-center space-x-1.5 text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Online Sync</span>
        </div>

        <div className="flex items-center space-x-1 text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>GPS Geofence: Aktivní</span>
        </div>
      </div>

      {/* User Persona / Role Switcher */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenQuickAttendance}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Rychlý příchod</span>
        </button>

        {/* Quick Role Switch dropdown */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>

          <div className="text-left pr-2">
            <div className="text-xs font-bold text-slate-200 line-clamp-1">
              {currentUser.firstName} {currentUser.lastName}
            </div>
            <select
              value={currentUser.role}
              onChange={e => onSwitchRole(e.target.value as UserRole)}
              className="text-[10px] font-mono text-cyan-400 font-semibold bg-transparent border-none focus:outline-none cursor-pointer"
            >
              <option value="SUPERADMIN">Role: SUPERADMIN</option>
              <option value="VEDOUCI">Role: VEDOUCI</option>
              <option value="MONTER">Role: MONTER</option>
              <option value="ADMINISTRACE">Role: ADMINISTRACE</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
