'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { t } from '@/lib/admin-i18n';

const STEP_LABELS = [
  t('Leggo il brief…', 'Reading the brief…'),
  t('Progetto le sezioni…', 'Designing the sections…'),
  t('Scrivo i contenuti…', 'Writing the content…'),
  t('Creo la pagina…', 'Creating the page…'),
];

/**
 * First-run: quando il sito non ha ancora pagine, l'utente descrive la sua
 * attività e l'AI genera la homepage completa (usa /api/ai/generate context page).
 */
export function AiFirstRun() {
  const router = useRouter();
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((j) => setAiReady(!!j.configured))
      .catch(() => setAiReady(false));
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1)), 8000);
    return () => clearInterval(t);
  }, [busy]);

  async function generate() {
    if (brief.trim().length < 20) {
      setError(t('Racconta qualcosa in più (almeno un paio di frasi): settore, cosa offri, a chi ti rivolgi.', 'Tell us a bit more (at least a couple of sentences): your industry, what you offer, who you serve.'));
      return;
    }
    setError('');
    setBusy(true);
    setStep(0);
    try {
      const prompt = `Crea la HOMEPAGE completa per questa attività:\n\n"${brief.trim()}"\n\nStruttura consigliata: hero con headline forte e 1-2 bottoni; sezione punti di forza o servizi (3 card); sezione "chi siamo" o numeri chiave; testimonianze solo se sensate; CTA finale. Scrivi testi REALI e specifici per questa attività (mai lorem ipsum, mai segnaposto), nella stessa lingua del brief. Usa i colori del tema.`;
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, context: 'page' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t(`Errore ${res.status}`, `Error ${res.status}`));
      if (data.kind !== 'page' || !data.result?.sections) throw new Error(t('La risposta AI non è una pagina valida. Riprova.', 'The AI response is not a valid page. Try again.'));

      const created = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Home', isHomepage: true }),
      });
      const page = await created.json();
      if (!created.ok) throw new Error(page.error || t('Creazione pagina fallita', 'Page creation failed'));

      const patched = await fetch(`/api/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: data.result }),
      });
      if (!patched.ok) throw new Error(t('Salvataggio contenuto fallito', 'Failed to save content'));

      router.push(`/editor/${page.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Errore sconosciuto', 'Unknown error'));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl text-left">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">{t('Fai costruire la homepage all\'AI', 'Let AI build your homepage')}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t('Descrivi la tua attività: l\'AI progetta le sezioni e scrive i contenuti. Poi rifinisci tutto nell\'editor visuale.', 'Describe your business: the AI designs the sections and writes the content. Then refine everything in the visual editor.')}
        </p>

        {aiReady === false && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm mb-4">
            {t('Per usare l\'AI serve una chiave Anthropic:', 'To use AI you need an Anthropic key:')}{' '}
            <ol className="list-decimal ml-5 mt-2 space-y-1">
              <li>{t('Creala su', 'Create it at')} <span className="font-mono text-xs">console.anthropic.com/settings/keys</span></li>
              <li>{t('Incollala in', 'Paste it into')} <Link className="underline font-medium" href="/admin/settings?tab=integrations">{t('Impostazioni → Integrazioni', 'Settings → Integrations')}</Link></li>
              <li>{t('Torna qui e ricarica', 'Come back here and reload')}</li>
            </ol>
          </div>
        )}

        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          disabled={busy || aiReady === false}
          rows={4}
          placeholder={t('Es. Siamo una torrefazione artigianale di Verona, vendiamo caffè specialty online e ai bar della zona. Tono caldo e diretto, clienti sia privati che locali.', 'E.g. We\'re an artisan coffee roastery in Verona, selling specialty coffee online and to local cafés. Warm, direct tone, serving both consumers and businesses.')}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={generate} disabled={busy || aiReady !== true}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {STEP_LABELS[step]}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t('Genera la homepage', 'Generate the homepage')}
              </>
            )}
          </Button>
          {aiReady === null && <span className="text-xs text-muted-foreground">{t('Verifico la configurazione AI…', 'Checking AI configuration…')}</span>}
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground mt-4">
        {t('Preferisci partire da zero?', 'Prefer to start from scratch?')} <Link className="underline" href="/admin/pages/new">{t('Crea una pagina vuota', 'Create a blank page')}</Link>
      </p>
    </div>
  );
}
