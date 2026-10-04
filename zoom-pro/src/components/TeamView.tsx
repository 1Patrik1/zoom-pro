import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  Briefcase,
  UserCheck,
  Plus,
} from 'lucide-react';
import { User, UserRole } from '../types';

interface TeamViewProps {
  users: User[];
  onUpdateUser: (id: string, updates: Partial<User>) => Promise<void>;
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
}

export const TeamView: React.FC<TeamViewProps> = ({
  users,
  onUpdateUser,
  onAddUser,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('MONTER');
  const [newRate, setNewRate] = useState(480);
  const [newPhone, setNewPhone] = useState('+420 777 123 456');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddUser({
      companyId: '00000000-0000-4000-8000-000000000001',
      email: newEmail,
      firstName: newFirstName,
      lastName: newLastName,
      role: newRole,
      isApproved: true,
      hourlyRate: newRate,
      phone: newPhone,
      employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      twoFactorEnabled: false,
    });
    setShowAddModal(false);
    setNewEmail('');
    setNewFirstName('');
    setNewLastName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-cyan-400" />
            <span>Tým & Oprávnění montážních čet</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Správa uživatelských rolí, schvalování nových pracovníků a hodinových montážních sazeb
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Přidat montéra / pracovníka</span>
        </button>
      </div>

      {/* Team Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Pracovník</th>
                <th className="py-3 px-4">Kontakt</th>
                <th className="py-3 px-4">Role & Oprávnění</th>
                <th className="py-3 px-4">Sazba (Kč/h)</th>
                <th className="py-3 px-4">Stav schválení</th>
                <th className="py-3 px-4 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-200 text-sm">
                      {u.firstName} {u.lastName}
                    </div>
                    <div className="text-slate-500 text-[11px] font-mono">
                      ID: {u.employeeId || 'PLATFORM-OWNER'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{u.email}</span>
                    </div>
                    {u.phone && (
                      <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] mt-0.5">
                        <Phone className="w-3 h-3 text-slate-600" />
                        <span>{u.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      onChange={e => onUpdateUser(u.id, { role: e.target.value as UserRole })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold text-cyan-400 focus:outline-none"
                    >
                      <option value="SUPERADMIN">SUPERADMIN</option>
                      <option value="VEDOUCI">VEDOUCI</option>
                      <option value="MONTER">MONTER</option>
                      <option value="ADMINISTRACE">ADMINISTRACE</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {u.hourlyRate || 450} Kč/h
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onUpdateUser(u.id, { isApproved: !u.isApproved })}
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        u.isApproved
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {u.isApproved ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Schválen</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Neschválen</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-[11px] text-slate-500 font-mono">
                      2FA: {u.twoFactorEnabled ? 'Zapnuto' : 'Vypnuto'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              <span>Registrace nového člena týmu</span>
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Jméno</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={e => setNewFirstName(e.target.value)}
                    required
                    placeholder="Petr"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Příjmení</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={e => setNewLastName(e.target.value)}
                    required
                    placeholder="Novotný"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                  placeholder="p.novotny@vzt-system.cz"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  >
                    <option value="MONTER">MONTER</option>
                    <option value="VEDOUCI">VEDOUCI</option>
                    <option value="ADMINISTRACE">ADMINISTRACE</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hodinová sazba (Kč)</label>
                  <input
                    type="number"
                    value={newRate}
                    onChange={e => setNewRate(parseInt(e.target.value) || 0)}
                    step="20"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-xl shadow-lg"
                >
                  Přidat do týmu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
