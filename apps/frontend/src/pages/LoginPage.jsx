import { useState } from 'react';

export function LoginPage({ onSubmit, loading, error }) {
  const [isRegister, setIsRegister] = useState(false);
  const [wantsJoin, setWantsJoin] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', companyName: '', joinId: '' });
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    try {
      const result = await onSubmit({
        isRegister,
        email: form.email,
        password: form.password,
        companyName: isRegister && !wantsJoin ? form.companyName : '',
        joinId: isRegister && wantsJoin ? form.joinId : ''
      });
      if (result?.msg) setMessage(result.msg);
    } catch {
      // chyba už je ve stavu hooku
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Zoom Pro</p>
        <h1 className="mb-6 text-2xl font-black text-white">{isRegister ? 'Registrace firmy / pracovníka' : 'Přihlášení do systému'}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required type="email" placeholder="E-mail" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required type="password" placeholder="Heslo" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />

          {isRegister && (
            <>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={wantsJoin} onChange={(e) => setWantsJoin(e.target.checked)} />
                Chci se připojit do existující firmy
              </label>

              {wantsJoin ? (
                <input value={form.joinId} onChange={(e) => setForm({ ...form, joinId: e.target.value })} required placeholder="Kód firmy / companyId" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
              ) : (
                <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required placeholder="Název firmy" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
              )}
            </>
          )}

          {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{error}</div>}
          {message && <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{message}</div>}

          <button disabled={loading} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase text-white disabled:opacity-60">
            {loading ? 'Probíhá...' : isRegister ? 'Registrovat' : 'Přihlásit'}
          </button>
        </form>

        <button onClick={() => setIsRegister((v) => !v)} className="mt-4 w-full text-center text-sm font-bold text-slate-400 hover:text-slate-200">
          {isRegister ? 'Mám účet, chci se přihlásit' : 'Nemám účet, chci registraci'}
        </button>
      </div>
    </div>
  );
}
