import { useState } from 'react';

export function LoginPage({ onSubmit, loading, error }) {
  const [screen, setScreen] = useState('welcome');
  const [isRegister, setIsRegister] = useState(false);
  const [wantsJoin, setWantsJoin] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', companyName: '', joinId: '', ico: '', dic: '', street: '', city: '', zip: '', phone: '', companyEmail: '', companyPhone: '', employmentType: 'INTERNAL' });
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
        joinId: isRegister && wantsJoin ? form.joinId : '',
        ico: isRegister && (!wantsJoin || form.employmentType === 'EXTERNAL') ? form.ico : '',
        dic: isRegister && (!wantsJoin || form.employmentType === 'EXTERNAL') ? form.dic : '',
        street: isRegister && (!wantsJoin || form.employmentType === 'EXTERNAL') ? form.street : '',
        city: isRegister && (!wantsJoin || form.employmentType === 'EXTERNAL') ? form.city : '',
        zip: isRegister && (!wantsJoin || form.employmentType === 'EXTERNAL') ? form.zip : '',
        phone: isRegister && wantsJoin ? form.phone : '',
        companyEmail: isRegister && !wantsJoin ? form.companyEmail : '',
        companyPhone: isRegister && !wantsJoin ? form.companyPhone : '',
        employmentType: isRegister && wantsJoin ? form.employmentType : 'INTERNAL'
      });
      if (result?.msg) setMessage(result.msg);
    } catch {
      // chyba už je ve stavu hooku
    }
  }

  if (screen === 'welcome') {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030712] px-5 py-10 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(0,111,255,0.22),transparent_55%)]" />
        <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <img src="/brand/zoom-pro-logo.png" alt="Zoom Pro" className="mb-5 aspect-square w-56 rounded-3xl object-contain sm:w-72" />
          <p className="text-xs font-black uppercase tracking-[0.38em] text-sky-400">Řízení stavebních projektů</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Vítejte v Zoom Pro</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Projekty, tým, docházka a komunikace přehledně na jednom místě.</p>
          <div className="mt-8 grid w-full max-w-md gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => { setIsRegister(false); setScreen('auth'); }} className="rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black uppercase tracking-wide shadow-lg shadow-blue-950/50 transition hover:bg-blue-500">Přihlásit se</button>
            <button type="button" onClick={() => { setIsRegister(true); setScreen('auth'); }} className="rounded-2xl border border-slate-600 bg-slate-900/70 px-5 py-4 text-sm font-black uppercase tracking-wide transition hover:border-sky-400 hover:bg-slate-800">Registrace</button>
          </div>
          <p className="mt-8 text-xs text-slate-500">Bezpečný přístup pro vaši firmu a její tým</p>
        </section>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50">
        <button type="button" onClick={() => setScreen('welcome')} className="mb-4 block" aria-label="Zpět na úvod">
          <img src="/brand/zoom-pro-wordmark.png" alt="Zoom Pro" className="h-12 w-56 object-contain object-left" />
        </button>
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
                <div className="space-y-3">
                  <input value={form.joinId} onChange={(e) => setForm({ ...form, joinId: e.target.value })} required placeholder="Kód firmy / companyId" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input type="checkbox" checked={form.employmentType === 'EXTERNAL'} onChange={(e) => setForm({ ...form, employmentType: e.target.checked ? 'EXTERNAL' : 'INTERNAL' })} />
                    Jsem externí spolupracovník
                  </label>
                  {form.employmentType === 'EXTERNAL' && <BusinessFields form={form} setForm={setForm} member />}
                  {form.employmentType !== 'EXTERNAL' && <p className="text-xs text-slate-500">Interní člen nemusí uvádět podnikatelské údaje.</p>}
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefon (volitelné)" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
                </div>
              ) : (
                <div className="space-y-3">
                  <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required placeholder="Název firmy" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
                  <BusinessFields form={form} setForm={setForm} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input type="email" value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} placeholder="Kontaktní e-mail firmy (volitelné)" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
                    <input type="tel" value={form.companyPhone} onChange={(e) => setForm({ ...form, companyPhone: e.target.value })} placeholder="Telefon firmy (volitelné)" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none" />
                  </div>
                </div>
              )}
            </>
          )}

          {error && <div className="rounded-2xl border border-rose-900 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{error}</div>}
          {message && <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{message}</div>}

          <button disabled={loading} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase text-white disabled:opacity-60">
            {loading ? 'Probíhá...' : isRegister ? 'Registrovat' : 'Přihlásit'}
          </button>
        </form>

        <button type="button" onClick={() => setIsRegister((v) => !v)} className="mt-4 w-full text-center text-sm font-bold text-slate-400 hover:text-slate-200">
          {isRegister ? 'Mám účet, chci se přihlásit' : 'Nemám účet, chci registraci'}
        </button>
      </div>
    </div>
  );
}

function BusinessFields({ form, setForm, member = false }) {
  const field = 'w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none';
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{member ? 'Údaje externího člena (volitelné)' : 'Identifikační údaje firmy'}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={form.ico} onChange={update('ico')} required={!member} placeholder="IČO" className={field} />
        <input value={form.dic} onChange={update('dic')} placeholder="DIČ (pokud je přiděleno)" className={field} />
        <input value={form.street} onChange={update('street')} required={!member} placeholder="Ulice a číslo" className={field} />
        <input value={form.city} onChange={update('city')} required={!member} placeholder="Město" className={field} />
        <input value={form.zip} onChange={update('zip')} placeholder="PSČ" className={field} />
      </div>
    </div>
  );
}
