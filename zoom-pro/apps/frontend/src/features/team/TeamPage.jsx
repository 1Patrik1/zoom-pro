export function TeamPage({ user, db, onApprove, onChangeRole }) {
  const adminCanEdit = ['SUPERADMIN', 'REDITEL'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-blue-900/50 bg-blue-950/20 p-6 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-blue-400">Kód firmy pro zaměstnance</p>
        <p className="mt-3 text-2xl font-black text-white">{user.companyId}</p>
      </div>

      <div className="space-y-3">
        {(db.users || []).map((member) => (
          <div key={member.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-black text-white">{member.email}</p>
                <p className="text-sm text-slate-400">Role: {member.role}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {!member.isApproved && (
                  <button onClick={() => onApprove({ userId: member.id })} className="rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black uppercase text-white">Schválit</button>
                )}
                {adminCanEdit && member.role !== 'SUPERADMIN' ? (
                  <select value={member.role} onChange={(e) => onChangeRole({ userId: member.id, role: e.target.value })} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-amber-400 outline-none">
                    <option value="MONTER">Montér</option>
                    <option value="VEDOUCI">Vedoucí</option>
                    <option value="ADMINISTRACE">Administrace</option>
                    <option value="REDITEL">Ředitel</option>
                  </select>
                ) : (
                  <span className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-300">{member.role}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
