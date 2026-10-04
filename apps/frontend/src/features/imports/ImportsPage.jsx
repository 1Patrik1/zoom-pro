import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import { ImportJobDetailPanel } from './ImportJobDetailPanel.jsx';

const MODULE_HINTS = ['inventory', 'attendance', 'projects', 'documents', 'invoices'];

export function ImportsPage({ token }) {
  const [profiles, setProfiles] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [profilesResult, jobsResult] = await Promise.all([
        api.get('imports/profiles', token),
        api.get('imports/jobs', token)
      ]);
      setProfiles(Array.isArray(profilesResult) ? profilesResult : []);
      const rows = Array.isArray(jobsResult) ? jobsResult : [];
      setJobs(rows);
      setSelectedJobId((current) => {
        if (rows.some((job) => job.id === current)) return current;
        return rows[0]?.id || '';
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) || null, [jobs, selectedJobId]);
  const stats = useMemo(() => ({
    totalJobs: jobs.length,
    dryRuns: jobs.filter((job) => job.isDryRun).length,
    completed: jobs.filter((job) => job.status === 'COMPLETED').length,
    failed: jobs.filter((job) => ['FAILED', 'ROLLED_BACK'].includes(job.status)).length
  }), [jobs]);

  async function handleCreateJob(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setError('');
    setMessage('');
    try {
      const created = await api.post('imports/jobs', token, {
        moduleKey: form.moduleKey.value,
        sourceFileName: form.sourceFileName.value,
        sourceFileUrl: form.sourceFileUrl.value,
        isDryRun: form.isDryRun.checked
      });
      setMessage(`Import job ${created.id} byl založen.`);
      form.reset();
      await loadData();
      if (created?.id) setSelectedJobId(created.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Import joby" value={stats.totalJobs} tone="text-white" />
        <StatCard title="Dry run" value={stats.dryRuns} tone="text-sky-400" />
        <StatCard title="Dokončeno" value={stats.completed} tone="text-emerald-400" />
        <StatCard title="Selhalo" value={stats.failed} tone="text-rose-400" />
      </section>

      <section className="grid gap-6 2xl:grid-cols-[420px_minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <form onSubmit={handleCreateJob} className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-black text-blue-400">Nový import job</h2>
            <p className="text-sm text-slate-400">Založí importní úlohu nad konkrétním modulem. URL zdroje je povinná, protože backend ukládá referenci na zdrojový soubor.</p>
            <input name="moduleKey" required list="module-key-hints" placeholder="moduleKey (např. inventory)" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
            <datalist id="module-key-hints">
              {MODULE_HINTS.map((item) => <option key={item} value={item} />)}
            </datalist>
            <input name="sourceFileName" required placeholder="Název souboru" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
            <input name="sourceFileUrl" required placeholder="URL zdrojového souboru" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
            <label className="flex items-center gap-2 text-sm text-slate-300"><input name="isDryRun" type="checkbox" /> Dry run bez zápisu</label>
            {message && <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{message}</div>}
            {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{error}</div>}
            <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase text-white">Vytvořit import</button>
          </form>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-emerald-400">Import profily</h3>
            <div className="space-y-3">
              {profiles?.map((profile) => (
                <div key={profile.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="font-black text-white">{profile.name}</p>
                  <p className="text-xs text-slate-500">{profile.moduleKey} • {profile.format}</p>
                </div>
              ))}
              {!profiles.length && <p className="text-sm text-slate-500">Zatím nejsou seeded import profily.</p>}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-amber-400">Historie importů</h3>
              <p className="text-sm text-slate-400">Klikni na job pro zobrazení detailu, statistik a error logu.</p>
            </div>
            <button onClick={loadData} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300">Obnovit</button>
          </div>
          {loading && <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">Načítám importy...</div>}
          <div className="space-y-3">
            {jobs?.map((job) => (
              <div key={job.id} onClick={() => setSelectedJobId(job.id)} className={`cursor-pointer rounded-2xl border p-4 ${selectedJobId === job.id ? 'border-blue-700 bg-blue-950/20' : 'border-slate-800 bg-slate-950'}`}>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black text-white">{job.moduleKey}</p>
                    <p className="text-xs text-slate-500">{job.sourceFileName || 'Bez souboru'} • {job.sourceFileUrl || 'bez URL'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-blue-400">{job.status}</p>
                    <p className="text-xs text-slate-500">{job.startedAt ? new Date(job.startedAt).toLocaleString() : '-'}</p>
                  </div>
                </div>
              </div>
            ))}
            {!loading && !jobs.length && <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-500">Zatím nebyl založen žádný import job.</div>}
          </div>
        </div>

        <ImportJobDetailPanel item={selectedJob} />
      </section>
    </div>
  );
}

function StatCard({ title, value, tone }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</p>
      <p className={`mt-3 text-2xl font-black ${tone}`}>{value}</p>
    </div>
  );
}
