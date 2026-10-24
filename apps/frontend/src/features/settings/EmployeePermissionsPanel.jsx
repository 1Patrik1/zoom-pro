import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import { userDisplayName } from '../../utils/user-name.js';

export function EmployeePermissionsPanel({ token }) {
  const [data, setData] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [grants, setGrants] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setError('');
    try {
      const result = await api.get('users/permissions', token);
      setData(result);
      setEmployeeId((current) => current || result.employees?.[0]?.id || '');
    } catch (err) { setError(err.message || 'Oprávnění se nepodařilo načíst.'); }
  }

  useEffect(() => { load(); }, [token]);

  const selected = data?.employees?.find((employee) => employee.id === employeeId);
  const employeeOverrides = useMemo(() => Object.fromEntries((data?.overrides || [])
    .filter((item) => item.userId === employeeId).map((item) => [item.key, item.granted])), [data, employeeId]);
  const roleDefaults = useMemo(() => Object.fromEntries((data?.roleDefaults || [])
    .filter((item) => item.role === selected?.role).map((item) => [item.key, item.granted])), [data, selected]);
  const effective = (key) => Object.prototype.hasOwnProperty.call(grants, key)
    ? grants[key]
    : Object.prototype.hasOwnProperty.call(employeeOverrides, key)
      ? employeeOverrides[key]
      : Boolean(roleDefaults[key]);

  useEffect(() => {
    setGrants({});
    setMessage('');
  }, [employeeId]);

  async function save() {
    if (!selected) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api.put('users/permissions', token, {
        userId: employeeId,
        overrides: (data.permissions || []).map((permission) => ({ key: permission.key, granted: effective(permission.key) }))
      });
      await load();
      setMessage('Oprávnění zaměstnance byla uložena.');
    } catch (err) { setError(err.message || 'Oprávnění se nepodařilo uložit.'); }
    finally { setBusy(false); }
  }

  const grouped = (data?.permissions || []).reduce((groups, permission) => {
    (groups[permission.moduleKey] ||= []).push(permission);
    return groups;
  }, {});

  return (
    <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div>
        <h2 className="text-lg font-black text-violet-400">Oprávnění zaměstnanců</h2>
        <p className="mt-1 text-sm text-slate-400">Volby se zobrazují jen pro moduly zahrnuté v aktivní licenci. Vypnutím odebereš zaměstnanci konkrétní oprávnění.</p>
      </div>
      {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
      {!data?.employees?.length && <p className="text-sm text-slate-400">Nejsou k dispozici žádné účty zaměstnanců ke správě.</p>}
      {!!data?.employees?.length && <>
        <label className="block space-y-2 text-sm text-slate-300">
          <span>Zaměstnanec</span>
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white">
            {data.employees.map((employee) => <option key={employee.id} value={employee.id}>{userDisplayName(employee)} · {employee.role}</option>)}
          </select>
        </label>
        {!data.permissions?.length && <p className="text-sm text-amber-300">Aktivní licence neobsahuje moduly, pro které lze nastavit zaměstnanecká oprávnění.</p>}
        <div className="space-y-4">
          {Object.entries(grouped).map(([moduleKey, permissions]) => (
            <div key={moduleKey} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-300">{moduleKey.replaceAll('_', ' ')}</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {permissions.map((permission) => (
                  <label key={permission.key} className="flex items-start gap-3 rounded-xl border border-slate-800 p-3 text-sm text-slate-300">
                    <input type="checkbox" checked={effective(permission.key)} onChange={(event) => setGrants((current) => ({ ...current, [permission.key]: event.target.checked }))} />
                    <span>{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={save} disabled={busy || !employeeId} className="rounded-2xl bg-violet-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Ukládám…' : 'Uložit oprávnění'}</button>
      </>}
      {message && <p role="status" className="text-sm text-emerald-400">{message}</p>}
    </section>
  );
}
