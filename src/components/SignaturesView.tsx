import React, { useState } from 'react';
import {
  PenTool,
  ShieldCheck,
  CheckCircle2,
  Clock,
  KeyRound,
  FileCheck,
  Plus,
  Lock,
} from 'lucide-react';
import { SignatureRequest, User } from '../types';
import { SignatureModal } from './SignatureModal';

interface SignaturesViewProps {
  currentUser: User;
  signatureRequests: SignatureRequest[];
  onCompleteSignature: (id: string, signedHash: string) => Promise<void>;
}

export const SignaturesView: React.FC<SignaturesViewProps> = ({
  currentUser,
  signatureRequests,
  onCompleteSignature,
}) => {
  const [activeSignModalReq, setActiveSignModalReq] = useState<SignatureRequest | null>(null);

  const handleSignComplete = async (sigData: { signatureImage: string; signedHash: string }) => {
    if (!activeSignModalReq) return;
    await onCompleteSignature(activeSignModalReq.id, sigData.signedHash);
    setActiveSignModalReq(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <PenTool className="w-6 h-6 text-cyan-400" />
            <span>Elektronické Podpisy & eIDAS Certifikáty</span>
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Auditní stopa podpisů smluv, stavebních deníků a předávacích protokolů se SHA-256 hashem
          </p>
        </div>
      </div>

      {/* Security Architecture Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-200">Kryptografický SHA-256</h4>
            <p className="text-xs text-slate-400 mt-0.5">Každý podpis generuje neměnný digitální otisk celého obsahu.</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-200">eIDAS & ČSN Shoda</h4>
            <p className="text-xs text-slate-400 mt-0.5">Zaručený elektronický podpis vhodný pro stavební řízení.</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-200">Auditní Záznam</h4>
            <p className="text-xs text-slate-400 mt-0.5">Zaznamenává IP adresu, GPS polohu, časové razítko a identitu.</p>
          </div>
        </div>
      </div>

      {/* Signature Requests Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center space-x-2">
          <FileCheck className="w-5 h-5 text-cyan-400" />
          <span>Žádosti o podpis a podepsané dokumenty ({signatureRequests.length})</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Dokument</th>
                <th className="py-3 px-4">Signatář / Role</th>
                <th className="py-3 px-4">Stav podpisu</th>
                <th className="py-3 px-4">Kryptografický Hash (Audit)</th>
                <th className="py-3 px-4 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {signatureRequests.map(req => (
                <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {req.documentTitle}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-300 font-medium">{req.signerName}</div>
                    <div className="text-slate-500 text-[11px] font-mono">{req.signerRole}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        req.status === 'SIGNED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {req.status === 'SIGNED' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>PODEPSÁNO</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>ČEKÁ NA PODPIS</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {req.signedHash ? (
                      <span className="text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {req.signedHash.slice(0, 28)}...
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {req.status !== 'SIGNED' ? (
                      <button
                        onClick={() => setActiveSignModalReq(req)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white text-xs font-bold shadow transition-all flex items-center space-x-1 ml-auto"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Podepsat nyní</span>
                      </button>
                    ) : (
                      <span className="text-slate-500 text-xs font-mono">
                        {new Date(req.signedAt!).toLocaleDateString('cs-CZ')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeSignModalReq && (
        <SignatureModal
          isOpen={!!activeSignModalReq}
          onClose={() => setActiveSignModalReq(null)}
          documentTitle={activeSignModalReq.documentTitle}
          signerName={activeSignModalReq.signerName}
          signerRole={activeSignModalReq.signerRole}
          onSignComplete={handleSignComplete}
        />
      )}
    </div>
  );
};
