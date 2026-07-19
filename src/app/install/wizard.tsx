'use client';

import { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Database, User, Globe, Bot, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';

type StepKey = 'db' | 'admin' | 'site' | 'ai' | 'done';

const STEPS: Array<{ key: StepKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'db', label: 'Database', icon: Database },
  { key: 'admin', label: 'Admin', icon: User },
  { key: 'site', label: 'Sito', icon: Globe },
  { key: 'ai', label: 'AI', icon: Bot },
  { key: 'done', label: 'Fine', icon: CheckCircle2 },
];

export function InstallWizard() {
  const [step, setStep] = useState<StepKey>('db');
  const [status, setStatus] = useState<{
    dbConfigured: boolean; dbOk: boolean; adminExists: boolean; siteExists: boolean; authSecretSet: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/install/status').then((r) => r.json()).then(setStatus);
  }, []);

  function next() { setError(null); const i = STEPS.findIndex((s) => s.key === step); setStep(STEPS[Math.min(i + 1, STEPS.length - 1)].key); }
  function back() { setError(null); const i = STEPS.findIndex((s) => s.key === step); setStep(STEPS[Math.max(i - 1, 0)].key); }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0010] via-[#2a0018] to-[#0a0008] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8 text-white">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#92003b] to-[#a4286a] flex items-center justify-center shadow-lg shadow-[#92003b]/40">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-lg leading-none">Element Node</div>
            <div className="text-[11px] uppercase tracking-wider text-white/50">Installazione guidata</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const idx = STEPS.findIndex((x) => x.key === step);
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={s.key} className="flex flex-col items-center gap-1.5 flex-1 relative">
                {i > 0 && (
                  <div className={`absolute h-px top-4 -left-1/2 w-full ${i <= idx ? 'bg-[#92003b]' : 'bg-white/15'}`} />
                )}
                <div className={`relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all
                  ${done ? 'bg-[#92003b] border-[#92003b] text-white' : active ? 'bg-white border-[#92003b] text-[#92003b]' : 'bg-transparent border-white/15 text-white/40'}`}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] uppercase tracking-wider ${active || done ? 'text-white' : 'text-white/40'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-card text-card-foreground border rounded-2xl shadow-2xl shadow-black/40 p-8">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          {step === 'db' && <StepDb onDone={next} setBusy={setBusy} setError={setError} status={status} reload={() => fetch('/api/install/status').then((r) => r.json()).then(setStatus)} />}
          {step === 'admin' && <StepAdmin onDone={next} onBack={back} setBusy={setBusy} setError={setError} />}
          {step === 'site' && <StepSite onDone={next} onBack={back} setBusy={setBusy} setError={setError} />}
          {step === 'ai' && <StepAi onDone={next} onBack={back} setBusy={setBusy} setError={setError} />}
          {step === 'done' && <StepDone />}

          {busy && (
            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Operazione in corso…
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-white/40 mt-6">
          Una volta completata l&apos;installazione viene creato il file <code>.install.lock</code> e questa pagina non sarà più accessibile.
        </p>
      </div>
    </div>
  );
}

// ─── Step 1: DB ──────────────────────────────────────────────
function StepDb({ onDone, setBusy, setError, status, reload }: {
  onDone: () => void; setBusy: (b: boolean) => void; setError: (e: string | null) => void;
  status: { dbConfigured: boolean; dbOk: boolean; authSecretSet: boolean } | null;
  reload: () => void;
}) {
  const [dbInfo, setDbInfo] = useState<{ url?: string; ok?: boolean }>({});
  const [migrated, setMigrated] = useState(false);

  async function testDb() {
    setBusy(true); setError(null);
    const r = await fetch('/api/install/test-db', { method: 'POST' });
    const d = await r.json();
    setBusy(false);
    if (!d.ok) { setError(d.message ?? d.error ?? 'Connessione fallita'); return; }
    setDbInfo({ url: d.url, ok: true });
    reload();
  }

  async function migrate() {
    setBusy(true); setError(null);
    const r = await fetch('/api/install/migrate', { method: 'POST' });
    const d = await r.json();
    setBusy(false);
    if (!d.ok) { setError(`${d.error}: ${d.stderr ?? ''}`.slice(0, 500)); return; }
    setMigrated(true); reload();
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold">Connessione al database</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Verifica la connessione e crea le tabelle. Le credenziali devono essere già state impostate nelle variabili ambiente di Plesk
          (<code className="font-mono text-xs">DATABASE_URL</code>).
        </p>
      </header>

      <div className="space-y-2 text-sm">
        <Row ok={status?.dbConfigured} label="DATABASE_URL configurato" hint={!status?.dbConfigured ? 'Impostalo nel pannello Plesk → Node.js → Custom env' : undefined} />
        <Row ok={status?.authSecretSet} label="AUTH_SECRET configurato" hint={!status?.authSecretSet ? 'Genera con `openssl rand -base64 32` e mettilo in env' : undefined} />
        <Row ok={dbInfo.ok || status?.dbOk} label="Connessione al MySQL funzionante" />
        <Row ok={migrated} label="Schema database creato" />
      </div>

      {dbInfo.url && <div className="text-xs font-mono px-3 py-2 bg-muted rounded">{dbInfo.url}</div>}

      <div className="flex flex-wrap gap-2 pt-2">
        <button onClick={testDb} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium">
          1. Testa connessione
        </button>
        <button onClick={migrate} disabled={!status?.dbConfigured} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
          2. Crea tabelle (db push)
        </button>
        <button onClick={onDone} disabled={!migrated && !(status?.dbOk && status?.adminExists === false)} className="ml-auto px-5 py-2 rounded-lg bg-[#92003b] hover:bg-[#7a0030] text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
          Continua <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Admin ───────────────────────────────────────────
function StepAdmin({ onDone, onBack, setBusy, setError }: {
  onDone: () => void; onBack: () => void; setBusy: (b: boolean) => void; setError: (e: string | null) => void;
}) {
  const [name, setName] = useState('Admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [created, setCreated] = useState(false);

  async function submit() {
    if (password.length < 8) { setError('Password min 8 caratteri'); return; }
    setBusy(true); setError(null);
    const r = await fetch('/api/install/admin', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setError(d.error === 'admin_exists' ? 'Esiste già un admin' : d.issues?.[0]?.message ?? d.hint ?? d.error); return; }
    setCreated(true);
    onDone();
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold">Crea il primo utente</h2>
        <p className="text-sm text-muted-foreground mt-1">Sarà l&apos;amministratore del CMS con accesso completo.</p>
      </header>

      <div className="space-y-3">
        <Field label="Nome" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="tu@esempio.com" />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="min 8 caratteri" />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm">Indietro</button>
        <button onClick={submit} disabled={!email || !password || created} className="ml-auto px-5 py-2 rounded-lg bg-[#92003b] hover:bg-[#7a0030] text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
          Crea admin <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Sito ────────────────────────────────────────────
function StepSite({ onDone, onBack, setBusy, setError }: {
  onDone: () => void; onBack: () => void; setBusy: (b: boolean) => void; setError: (e: string | null) => void;
}) {
  const [name, setName] = useState('Il mio sito');
  const [tagline, setTagline] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#92003b');

  async function submit() {
    setBusy(true); setError(null);
    const r = await fetch('/api/install/site', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, tagline, primaryColor }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setError(d.error ?? 'Errore'); return; }
    onDone();
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold">Configurazione sito</h2>
        <p className="text-sm text-muted-foreground mt-1">Brand iniziale: nome, tagline, colore primario. Modificabili in seguito da Site Settings.</p>
      </header>

      <div className="space-y-3">
        <Field label="Nome sito" value={name} onChange={setName} />
        <Field label="Tagline" value={tagline} onChange={setTagline} placeholder="(opzionale)" />
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Colore primario</label>
          <div className="flex gap-2 items-center mt-1">
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
            <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm font-mono" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm">Indietro</button>
        <button onClick={submit} className="ml-auto px-5 py-2 rounded-lg bg-[#92003b] hover:bg-[#7a0030] text-white text-sm font-medium flex items-center gap-1.5">
          Continua <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: AI ──────────────────────────────────────────────
function StepAi({ onDone, onBack, setBusy, setError }: {
  onDone: () => void; onBack: () => void; setBusy: (b: boolean) => void; setError: (e: string | null) => void;
}) {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [skipping, setSkipping] = useState(false);

  async function finalize() {
    setBusy(true); setError(null);
    if (anthropicKey) {
      await fetch('/api/install/site', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'site', anthropicKey, anthropicModel: 'claude-sonnet-5' }),
      });
    }
    const r = await fetch('/api/install/finalize', { method: 'POST' });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setError(d.error ?? 'Errore finalizzazione'); return; }
    onDone();
  }

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold">AI Anthropic <span className="text-sm font-normal text-muted-foreground">(opzionale)</span></h2>
        <p className="text-sm text-muted-foreground mt-1">Aggiungi la chiave per abilitare la generazione AI di contenuti e widget. Puoi farlo anche dopo da Site Settings.</p>
      </header>

      <Field label="Anthropic API Key" type="password" value={anthropicKey} onChange={setAnthropicKey} placeholder="sk-ant-..." />

      <div className="flex flex-wrap gap-2 pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm">Indietro</button>
        <button onClick={() => { setSkipping(true); finalize(); }} className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm">Salta</button>
        <button onClick={finalize} disabled={skipping} className="ml-auto px-5 py-2 rounded-lg bg-[#92003b] hover:bg-[#7a0030] text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-40">
          Completa installazione <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Done ────────────────────────────────────────────────────
function StepDone() {
  return (
    <div className="text-center space-y-5 py-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">Installazione completata</h2>
        <p className="text-sm text-muted-foreground mt-1">Ora puoi accedere al pannello admin.</p>
      </div>
      <a href="/login" className="inline-block px-6 py-3 bg-[#92003b] hover:bg-[#7a0030] text-white rounded-lg font-medium">
        Vai al login
      </a>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────
function Row({ ok, label, hint }: { ok?: boolean; label: string; hint?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center text-[10px] shrink-0
        ${ok ? 'bg-emerald-500 text-white' : 'bg-muted border'}`}>
        {ok ? '✓' : ''}
      </div>
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#92003b]/40 focus:border-[#92003b]"
      />
    </div>
  );
}
