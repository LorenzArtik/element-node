'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, Lock, KeyRound, Loader2, RefreshCw, Trash2, ExternalLink, ShieldCheck } from 'lucide-react';
import { t } from '@/lib/admin-i18n';
import type { LicenseTier } from '@/lib/license-features';

export interface LicenseState {
  key: string;
  valid: boolean;
  plan: string;
  reason: string;
  checkedAt: string;
  currentPeriodEnd: string | null;
  tier: LicenseTier;
}

const PRICING_URL = 'https://elementnode.cloud/en/pricing';
const ACCOUNT_URL = 'https://elementnode.cloud/en/account';

/** Righe "cosa sblocchi": per ogni tier lo stato (sbloccato/valore o lucchetto). */
function featureRows(tier: LicenseTier) {
  const licensed = tier !== 'free';
  return [
    {
      label: t('Widget disponibili nell’editor', 'Widgets available in the editor'),
      value:
        tier === 'full'
          ? t('Tutti i 51', 'All 51')
          : tier === 'essential'
            ? t('38 (base + 5 Pro)', '38 (base + 5 Pro)')
            : t('33 di base', '33 base'),
      ok: tier === 'full',
      partial: tier === 'essential',
    },
    {
      label: t('Aggiornamenti 1-click + patch di sicurezza', '1-click updates + security patches'),
      value: licensed ? t('Attivi', 'Active') : t('Bloccati', 'Locked'),
      ok: licensed,
      partial: false,
    },
    {
      label: t('Skill Claude Code sempre aggiornata dal CMS', 'Always-latest Claude Code skill from the CMS'),
      value: licensed ? t('Ultima versione impacchettata', 'Latest packaged version') : t('Copia pubblica GitHub', 'Public GitHub copy'),
      ok: licensed,
      partial: false,
    },
    {
      label: t('Badge “Made with Element Node” rimosso dal sito', '“Made with Element Node” badge removed from the site'),
      value: licensed ? t('Rimosso', 'Removed') : t('Visibile', 'Visible'),
      ok: licensed,
      partial: false,
    },
    {
      label: t('Supporto prioritario', 'Priority support'),
      value: licensed ? t('Incluso', 'Included') : t('Bloccato', 'Locked'),
      ok: licensed,
      partial: false,
    },
  ];
}

const TIER_LABEL: Record<LicenseTier, string> = {
  free: 'Free',
  essential: 'Essential',
  full: 'Full',
};

export function LicenseManager({ initial }: { initial: LicenseState }) {
  const [info, setInfo] = useState<LicenseState>(initial);
  const [keyInput, setKeyInput] = useState(initial.key);
  const [busy, setBusy] = useState<null | 'set' | 'remove' | 'recheck'>(null);

  async function call(action: 'set' | 'remove' | 'recheck') {
    setBusy(action);
    try {
      const res = await fetch('/api/admin/license', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, key: keyInput.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as LicenseState;
      setInfo(next);
      setKeyInput(next.key);
      if (action === 'remove') toast.success(t('Licenza rimossa', 'License removed'));
      else if (next.valid) toast.success(t(`Licenza attiva (${next.plan})`, `License active (${next.plan})`));
      else toast.error(t(`Licenza non attiva${next.reason ? ` — ${next.reason}` : ''}`, `License not active${next.reason ? ` — ${next.reason}` : ''}`));
    } catch {
      toast.error(t('Errore, riprova', 'Something went wrong, try again'));
    } finally {
      setBusy(null);
    }
  }

  const rows = featureRows(info.tier);
  const isFull = info.tier === 'full';
  const isFree = info.tier === 'free';

  return (
    <div className="space-y-6">
      {/* Stato */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                {info.valid ? <ShieldCheck className="h-5 w-5 text-emerald-500" /> : <KeyRound className="h-5 w-5 text-muted-foreground" />}
                {t('Stato licenza', 'License status')}
              </CardTitle>
              <CardDescription>
                {info.valid
                  ? t(`Piano ${info.plan} attivo su questo dominio.`, `${info.plan} plan active on this domain.`)
                  : info.key
                    ? t('Chiave inserita ma non attiva.', 'Key entered but not active.')
                    : t('Nessuna licenza: sei sulla versione Free.', 'No license: you’re on the Free version.')}
              </CardDescription>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                isFull ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : info.tier === 'essential' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                : 'bg-muted text-muted-foreground'
              }`}
            >
              {TIER_LABEL[info.tier]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {info.currentPeriodEnd && (
            <div>{t('Rinnovo', 'Renews')}: {new Date(info.currentPeriodEnd).toLocaleDateString()}</div>
          )}
          {info.checkedAt && (
            <div>{t('Ultimo controllo', 'Last check')}: {new Date(info.checkedAt).toLocaleString()}</div>
          )}
          {info.reason && !info.valid && (
            <div className="text-amber-600 dark:text-amber-400">{t('Motivo', 'Reason')}: {info.reason}</div>
          )}
        </CardContent>
      </Card>

      {/* Gestione chiave */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Chiave di licenza', 'License key')}</CardTitle>
          <CardDescription>{t('La trovi nella tua area clienti su elementnode.cloud dopo l’acquisto.', 'You get it in your customer area on elementnode.cloud after purchase.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="enl_XXXX-XXXX-XXXX-XXXX"
              className="font-mono"
            />
            <Button onClick={() => call('set')} disabled={busy !== null || !keyInput.trim()} className="shrink-0">
              {busy === 'set' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span className="ml-2">{t('Salva e attiva', 'Save & activate')}</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => call('recheck')} disabled={busy !== null || !info.key}>
              {busy === 'recheck' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">{t('Ricontrolla ora', 'Recheck now')}</span>
            </Button>
            {info.key && (
              <Button variant="ghost" size="sm" onClick={() => call('remove')} disabled={busy !== null} className="text-muted-foreground">
                {busy === 'remove' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span className="ml-2">{t('Rimuovi', 'Remove')}</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cosa sblocchi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Cosa include il tuo piano', 'What your plan includes')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
              <div className="flex items-center gap-2.5 text-sm">
                {r.ok ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : r.partial ? (
                  <Check className="h-4 w-4 shrink-0 text-sky-500" />
                ) : (
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                )}
                <span className={r.ok || r.partial ? '' : 'text-muted-foreground'}>{r.label}</span>
              </div>
              <span className="shrink-0 text-sm font-medium text-muted-foreground">{r.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CTA */}
      {isFull ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 p-5">
          <ShieldCheck className="h-6 w-6 text-emerald-500" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">{t('Hai tutto sbloccato.', 'Everything is unlocked.')}</div>
            <div className="text-muted-foreground">{t('Gestisci abbonamento e fatture dalla tua area clienti.', 'Manage your subscription and invoices in your customer area.')}</div>
          </div>
          <a href={ACCOUNT_URL} target="_blank" rel="noopener">
            <Button variant="outline">{t('Gestisci abbonamento', 'Manage subscription')} <ExternalLink className="ml-2 h-4 w-4" /></Button>
          </a>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/40">
          <div className="flex-1 text-sm">
            <div className="font-semibold">
              {isFree
                ? t('Sblocca tutti i widget Pro, gli aggiornamenti 1-click e togli il badge.', 'Unlock all Pro widgets, 1-click updates and remove the badge.')
                : t('Passa a un piano superiore per tutti i 51 widget.', 'Upgrade for all 51 widgets.')}
            </div>
            <div className="text-muted-foreground">{t('Open source per sempre. I piani finanziano gli aggiornamenti e il supporto.', 'Open source forever. Plans fund updates and support.')}</div>
          </div>
          <a href={PRICING_URL} target="_blank" rel="noopener">
            <Button>{isFree ? t('Sblocca tutto', 'Unlock everything') : t('Fai upgrade', 'Upgrade')} <ExternalLink className="ml-2 h-4 w-4" /></Button>
          </a>
        </div>
      )}
    </div>
  );
}
