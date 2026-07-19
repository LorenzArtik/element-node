'use client';

import { UpdaterCard } from '@/components/admin/UpdaterCard';
import { SkillCard } from '@/components/admin/SkillCard';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { SiteSettings } from '@/lib/site-settings';
import type { Theme, Integrations, RecaptchaScope } from '@/lib/theme';
import { recaptchaScopeKeys } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Cookie, Key, Save, Loader2, RotateCcw, Palette, Type, Layout, MousePointerClick, Code2, Image as ImageIcon, Wrench, Globe, Plug, Sparkles, Shield, Mail } from 'lucide-react';
import { MediaField } from '@/components/editor/MediaField';
import { FontPicker } from '@/components/admin/FontPicker';

type Patch = Partial<SiteSettings>;

export function SiteSettingsForm({ initial, defaultTab }: { initial: SiteSettings; defaultTab?: string }) {
  const [data, setData] = useState<SiteSettings>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function updateTheme<K extends keyof Theme>(section: K, patch: Partial<Theme[K]>) {
    setData((d) => ({ ...d, theme: { ...d.theme, [section]: { ...d.theme[section], ...patch } } }));
  }

  function updateIntegrations<K extends keyof Integrations>(key: K, value: Integrations[K]) {
    setData((d) => ({ ...d, integrations: { ...d.integrations, [key]: value } }));
  }

  function updateRecaptcha(patch: Partial<Integrations['recaptcha']>) {
    setData((d) => ({ ...d, integrations: { ...d.integrations, recaptcha: { ...d.integrations.recaptcha, ...patch } } }));
  }

  function toggleRecaptchaScope(scope: RecaptchaScope) {
    const current = data.integrations.recaptcha.enableOn;
    const next = current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope];
    updateRecaptcha({ enableOn: next });
  }

  function updateSmtp(patch: Partial<Integrations['smtp']>) {
    setData((d) => ({ ...d, integrations: { ...d.integrations, smtp: { ...d.integrations.smtp, ...patch } } }));
  }

  function updateBrevo(patch: Partial<Integrations['brevo']>) {
    setData((d) => ({ ...d, integrations: { ...d.integrations, brevo: { ...d.integrations.brevo, ...patch } } }));
  }

  function save() {
    const payload: Patch = data;
    start(async () => {
      try {
        const res = await fetch('/api/settings/site', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message ?? 'Errore salvataggio');
        }
        const fresh = await res.json();
        setData(fresh);
        toast.success('Impostazioni salvate');
        router.refresh();
      } catch (e) {
        toast.error('Errore', { description: (e as Error).message });
      }
    });
  }

  function reset() {
    setData(initial);
    toast.info('Modifiche annullate');
  }

  return (
    <>
      <Tabs defaultValue={defaultTab || 'brand'}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="brand"><ImageIcon className="h-3.5 w-3.5 mr-1" />Brand</TabsTrigger>
          <TabsTrigger value="colors"><Palette className="h-3.5 w-3.5 mr-1" />Colori</TabsTrigger>
          <TabsTrigger value="typography"><Type className="h-3.5 w-3.5 mr-1" />Font</TabsTrigger>
          <TabsTrigger value="layout"><Layout className="h-3.5 w-3.5 mr-1" />Layout</TabsTrigger>
          <TabsTrigger value="buttons"><MousePointerClick className="h-3.5 w-3.5 mr-1" />Buttons</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="h-3.5 w-3.5 mr-1" />API</TabsTrigger>
          <TabsTrigger value="privacy"><Cookie className="h-3.5 w-3.5 mr-1" />Privacy</TabsTrigger>
          <TabsTrigger value="code"><Code2 className="h-3.5 w-3.5 mr-1" />Codice</TabsTrigger>
          <TabsTrigger value="advanced"><Wrench className="h-3.5 w-3.5 mr-1" />Avanzate</TabsTrigger>
        </TabsList>

        {/* ===== BRAND ===== */}
        <TabsContent value="brand">
          <Card>
            <CardHeader>
              <CardTitle>Identità del sito</CardTitle>
              <CardDescription>Nome, logo, favicon. Usati ovunque nel sito e nel backoffice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-2xl">
              <Field label="Nome del sito">
                <Input value={data.name} onChange={(e) => update('name', e.target.value)} />
              </Field>
              <Field label="Tagline / sottotitolo">
                <Input value={data.tagline ?? ''} onChange={(e) => update('tagline', e.target.value || null)} placeholder="Il tuo claim breve" />
              </Field>
              <Field label="Logo (light)" help="Logo per sfondi chiari. Usato nell'header di default.">
                <MediaField value={data.logoLight ?? ''} onChange={(v) => update('logoLight', v || null)} />
              </Field>
              <Field label="Logo (dark)" help="Logo per sfondi scuri.">
                <MediaField value={data.logoDark ?? ''} onChange={(v) => update('logoDark', v || null)} />
              </Field>
              <Field label="Favicon" help="32x32 o 64x64 PNG/ICO">
                <MediaField value={data.favicon ?? ''} onChange={(v) => update('favicon', v || null)} />
              </Field>
              <Field label="Lingua di default">
                <Input value={data.defaultLocale} onChange={(e) => update('defaultLocale', e.target.value)} placeholder="it" />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== COLORI ===== */}
        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle>Palette colori</CardTitle>
              <CardDescription>Definisci la tua palette. Tutti i widget useranno automaticamente questi colori.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ColorGroup title="Brand" colors={[
                { key: 'primary', label: 'Primario' },
                { key: 'primaryHover', label: 'Primario hover' },
                { key: 'secondary', label: 'Secondario' },
                { key: 'accent', label: 'Accent' },
              ]} value={data.theme.colors} onChange={(p) => updateTheme('colors', p)} />

              <ColorGroup title="Testo" colors={[
                { key: 'text', label: 'Testo principale' },
                { key: 'textMuted', label: 'Testo secondario' },
                { key: 'textInverse', label: 'Testo su sfondi scuri' },
              ]} value={data.theme.colors} onChange={(p) => updateTheme('colors', p)} />

              <ColorGroup title="Sfondi" colors={[
                { key: 'background', label: 'Sfondo pagina' },
                { key: 'surface', label: 'Sfondo card / surface' },
                { key: 'border', label: 'Bordi' },
              ]} value={data.theme.colors} onChange={(p) => updateTheme('colors', p)} />

              <ColorGroup title="Status" colors={[
                { key: 'success', label: 'Successo' },
                { key: 'warning', label: 'Attenzione' },
                { key: 'danger', label: 'Errore' },
                { key: 'info', label: 'Info' },
              ]} value={data.theme.colors} onChange={(p) => updateTheme('colors', p)} />

              <ColorGroup title="Personalizzati" colors={[
                { key: 'custom1', label: 'Custom 1' },
                { key: 'custom2', label: 'Custom 2' },
                { key: 'custom3', label: 'Custom 3' },
              ]} value={data.theme.colors} onChange={(p) => updateTheme('colors', p)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TIPOGRAFIA ===== */}
        <TabsContent value="typography">
          <Card>
            <CardHeader>
              <CardTitle>Tipografia</CardTitle>
              <CardDescription>Cerca e seleziona Google Fonts (caricati on-demand). Anche l&apos;AI userà questi font quando genera contenuti.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-2xl">
              <Field label="Font Heading">
                <FontPicker value={data.theme.typography.fontHeading} onChange={(v) => updateTheme('typography', { fontHeading: v })} />
              </Field>
              <Field label="Font Body">
                <FontPicker value={data.theme.typography.fontBody} onChange={(v) => updateTheme('typography', { fontBody: v })} />
              </Field>
              <Field label="Font Mono">
                <FontPicker value={data.theme.typography.fontMono} onChange={(v) => updateTheme('typography', { fontMono: v })} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Dimensione base">
                  <Input value={data.theme.typography.sizeBase} onChange={(e) => updateTheme('typography', { sizeBase: e.target.value })} />
                </Field>
                <Field label="Interlinea body">
                  <Input value={data.theme.typography.lineHeight} onChange={(e) => updateTheme('typography', { lineHeight: e.target.value })} />
                </Field>
                <Field label="Peso headings">
                  <Input value={data.theme.typography.headingWeight} onChange={(e) => updateTheme('typography', { headingWeight: e.target.value })} />
                </Field>
                <Field label="Peso body">
                  <Input value={data.theme.typography.bodyWeight} onChange={(e) => updateTheme('typography', { bodyWeight: e.target.value })} />
                </Field>
              </div>

              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold mb-3">Scala dimensioni</h4>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(data.theme.typography.scale) as Array<keyof Theme['typography']['scale']>).map((k) => (
                    <Field key={String(k)} label={String(k).toUpperCase()}>
                      <Input value={data.theme.typography.scale[k]} onChange={(e) => updateTheme('typography', { scale: { ...data.theme.typography.scale, [k]: e.target.value } })} />
                    </Field>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== LAYOUT ===== */}
        <TabsContent value="layout">
          <Card>
            <CardHeader>
              <CardTitle>Layout</CardTitle>
              <CardDescription>Dimensioni del container, breakpoint responsive, padding sezioni di default.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Larghezza max contenitore"><Input value={data.theme.layout.containerMax} onChange={(e) => updateTheme('layout', { containerMax: e.target.value })} /></Field>
                <Field label="Gutter (gap colonne)"><Input value={data.theme.layout.gutter} onChange={(e) => updateTheme('layout', { gutter: e.target.value })} /></Field>
                <Field label="Breakpoint Tablet"><Input value={data.theme.layout.breakpointTablet} onChange={(e) => updateTheme('layout', { breakpointTablet: e.target.value })} /></Field>
                <Field label="Breakpoint Mobile"><Input value={data.theme.layout.breakpointMobile} onChange={(e) => updateTheme('layout', { breakpointMobile: e.target.value })} /></Field>
              </div>
              <Field label="Padding default sezioni"><Input value={data.theme.layout.sectionPadding} onChange={(e) => updateTheme('layout', { sectionPadding: e.target.value })} /></Field>

              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold mb-3">Border radius</h4>
                <div className="grid grid-cols-5 gap-3">
                  {(Object.keys(data.theme.radius) as Array<keyof Theme['radius']>).map((k) => (
                    <Field key={String(k)} label={String(k).toUpperCase()}>
                      <Input value={data.theme.radius[k]} onChange={(e) => updateTheme('radius', { [k]: e.target.value })} />
                    </Field>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== BUTTONS ===== */}
        <TabsContent value="buttons">
          <Card>
            <CardHeader>
              <CardTitle>Stile pulsanti</CardTitle>
              <CardDescription>Look globale dei bottoni. Si applica a tutti i widget Button e ai CTA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Border radius"><Input value={data.theme.buttons.radius} onChange={(e) => updateTheme('buttons', { radius: e.target.value })} /></Field>
                <Field label="Padding orizzontale"><Input value={data.theme.buttons.paddingX} onChange={(e) => updateTheme('buttons', { paddingX: e.target.value })} /></Field>
                <Field label="Padding verticale"><Input value={data.theme.buttons.paddingY} onChange={(e) => updateTheme('buttons', { paddingY: e.target.value })} /></Field>
                <Field label="Peso testo"><Input value={data.theme.buttons.fontWeight} onChange={(e) => updateTheme('buttons', { fontWeight: e.target.value })} /></Field>
              </div>

              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold mb-3">Form inputs</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Border radius"><Input value={data.theme.forms.radius} onChange={(e) => updateTheme('forms', { radius: e.target.value })} /></Field>
                  <Field label="Colore bordo"><ColorPick value={data.theme.forms.borderColor} onChange={(v) => updateTheme('forms', { borderColor: v })} /></Field>
                  <Field label="Colore focus"><ColorPick value={data.theme.forms.focusColor} onChange={(v) => updateTheme('forms', { focusColor: v })} /></Field>
                  <Field label="Sfondo"><ColorPick value={data.theme.forms.background} onChange={(v) => updateTheme('forms', { background: v })} /></Field>
                </div>
              </div>

              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold mb-3">Anteprima</h4>
                <div className="flex gap-3 flex-wrap p-4 bg-muted rounded-lg">
                  <button style={{
                    background: 'var(--en-color-primary)', color: 'var(--en-color-text-inverse)',
                    borderRadius: 'var(--en-button-radius)', padding: 'var(--en-button-py) var(--en-button-px)',
                    fontWeight: 'var(--en-button-fw)', border: 0, cursor: 'pointer',
                  }}>Primary</button>
                  <button style={{
                    background: 'transparent', color: 'var(--en-color-primary)',
                    borderRadius: 'var(--en-button-radius)', padding: 'var(--en-button-py) var(--en-button-px)',
                    fontWeight: 'var(--en-button-fw)', border: '2px solid var(--en-color-primary)', cursor: 'pointer',
                  }}>Outline</button>
                  <button style={{
                    background: 'var(--en-color-secondary)', color: 'var(--en-color-text-inverse)',
                    borderRadius: 'var(--en-button-radius)', padding: 'var(--en-button-py) var(--en-button-px)',
                    fontWeight: 'var(--en-button-fw)', border: 0, cursor: 'pointer',
                  }}>Secondary</button>
                  <input placeholder="Esempio input" style={{
                    background: 'var(--en-form-bg)', borderRadius: 'var(--en-form-radius)',
                    border: '1px solid var(--en-form-border)', padding: '8px 12px',
                  }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== INTEGRATIONS ===== */}
        <TabsContent value="integrations">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Key className="h-4 w-4 text-primary" /> Licenza Element Node</CardTitle>
                <CardDescription>
                  La licenza attiva aggiornamenti gestiti, patch di sicurezza e supporto.{' '}
                  <a href="https://elementnode.cloud/it/pricing" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Acquista o gestisci →</a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <Field label="Chiave di licenza" help="Formato enl_XXXX-XXXX-XXXX-XXXX — la ricevi via email dopo l'acquisto. La validazione avviene automaticamente entro qualche minuto dal salvataggio.">
                  <Input value={data.integrations.licenseKey ?? ''} onChange={(e) => updateIntegrations('licenseKey', e.target.value.trim())} placeholder="enl_XXXX-XXXX-XXXX-XXXX" />
                </Field>
                {data.integrations.licenseCache?.checkedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Stato: {data.integrations.licenseCache.valid
                      ? `✓ attiva (${data.integrations.licenseCache.plan})`
                      : `non attiva${data.integrations.licenseCache.reason ? ` — ${data.integrations.licenseCache.reason}` : ''}`}
                    {' · '}ultimo controllo {new Date(data.integrations.licenseCache.checkedAt).toLocaleString('it-IT')}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <UpdaterCard />

            <SkillCard />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Anthropic (Claude)</CardTitle>
                <CardDescription>Override delle credenziali del file <code>.env</code>. Lascia vuoto per usare i valori dell'ambiente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <Field label="ANTHROPIC_API_KEY">
                  <Input type="password" value={data.integrations.anthropicApiKey} onChange={(e) => updateIntegrations('anthropicApiKey', e.target.value)} placeholder="sk-ant-..." />
                </Field>
                <Field label="Modello (lascia vuoto per default)" help="es. claude-sonnet-4-6, claude-opus-4-7">
                  <Input value={data.integrations.anthropicModel} onChange={(e) => updateIntegrations('anthropicModel', e.target.value)} placeholder="claude-sonnet-4-6" />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-500" /> Google reCAPTCHA v3</CardTitle>
                <CardDescription>Protegge dai bot. Genera le chiavi su <code>google.com/recaptcha</code>. Threshold consigliato 0.5.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <Field label="Site Key (pubblica)">
                  <Input value={data.integrations.recaptcha.siteKey} onChange={(e) => updateRecaptcha({ siteKey: e.target.value })} placeholder="6Lc..." />
                </Field>
                <Field label="Secret Key (server)">
                  <Input type="password" value={data.integrations.recaptcha.secretKey} onChange={(e) => updateRecaptcha({ secretKey: e.target.value })} placeholder="6Lc..." />
                </Field>
                <Field label={`Threshold: ${data.integrations.recaptcha.threshold}`} help="Se score < threshold la richiesta è bloccata. 0=permissivo, 1=strict.">
                  <input type="range" min={0} max={1} step={0.05} value={data.integrations.recaptcha.threshold} onChange={(e) => updateRecaptcha({ threshold: Number(e.target.value) })} className="w-full" />
                </Field>
                <div>
                  <Label className="text-xs">Abilita su</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">Spunta dove vuoi attivare la protezione bot. Disabilitato finché non ci sono Site Key e Secret.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {recaptchaScopeKeys.map((scope) => {
                      const labels: Record<string, string> = { forms: 'Form', login: 'Login', register: 'Registrazione', 'forgot-password': 'Password dimenticata' };
                      return (
                        <label key={scope} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-muted/40">
                          <input
                            type="checkbox"
                            checked={data.integrations.recaptcha.enableOn.includes(scope)}
                            onChange={() => toggleRecaptchaScope(scope)}
                            disabled={!data.integrations.recaptcha.siteKey || !data.integrations.recaptcha.secretKey}
                          />
                          <span className="text-sm">{labels[scope]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-500" /> Email transazionali</CardTitle>
                <CardDescription>
                  Scegli come inviare email (verifica account, reset password, contatti form).
                  In modalità <b>Console</b> le email vengono solo loggate nel terminale (utile in sviluppo, NON usare in produzione).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <div className="space-y-1.5">
                  <Label className="text-xs">Provider</Label>
                  <Select
                    value={data.integrations.emailProvider}
                    onValueChange={(v) => updateIntegrations('emailProvider', v as Integrations['emailProvider'])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="console">Console (solo log, sviluppo)</SelectItem>
                      <SelectItem value="smtp">SMTP (server email proprio)</SelectItem>
                      <SelectItem value="brevo">Brevo (ex Sendinblue, API key)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Se lasci &quot;Console&quot; ma compili Brevo o SMTP, il provider viene auto-rilevato.
                  </p>
                </div>

                {data.integrations.emailProvider === 'brevo' && (
                  <div className="space-y-3 p-3 border rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      📨 Brevo (consigliato)
                    </div>
                    <Field label="API Key">
                      <Input type="password" value={data.integrations.brevo.apiKey} onChange={(e) => updateBrevo({ apiKey: e.target.value })} placeholder="xkeysib-..." />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="From email">
                        <Input value={data.integrations.brevo.fromEmail} onChange={(e) => updateBrevo({ fromEmail: e.target.value })} placeholder="noreply@tuosito.it" />
                      </Field>
                      <Field label="From name">
                        <Input value={data.integrations.brevo.fromName} onChange={(e) => updateBrevo({ fromName: e.target.value })} placeholder="Element Node" />
                      </Field>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Genera la API key su <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" className="text-primary hover:underline">app.brevo.com/settings/keys/api</a>.
                      Il dominio mittente deve essere verificato.
                    </p>
                  </div>
                )}

                {data.integrations.emailProvider === 'smtp' && (
                  <div className="space-y-3 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                      📡 SMTP (server email)
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Richiede <code>npm i nodemailer</code>. Override del .env: lascia vuoto per usare le env <code>SMTP_*</code>.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Host"><Input value={data.integrations.smtp.host} onChange={(e) => updateSmtp({ host: e.target.value })} placeholder="smtp.gmail.com" /></Field>
                      <Field label="Port"><Input value={data.integrations.smtp.port} onChange={(e) => updateSmtp({ port: e.target.value })} placeholder="587" /></Field>
                      <Field label="User"><Input value={data.integrations.smtp.user} onChange={(e) => updateSmtp({ user: e.target.value })} /></Field>
                      <Field label="Password"><Input type="password" value={data.integrations.smtp.pass} onChange={(e) => updateSmtp({ pass: e.target.value })} /></Field>
                      <Field label="From"><Input value={data.integrations.smtp.from} onChange={(e) => updateSmtp({ from: e.target.value })} placeholder='"Site" <noreply@dominio.it>' /></Field>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <Label className="text-xs">SSL/TLS (port 465)</Label>
                        <Switch checked={data.integrations.smtp.secure} onCheckedChange={(v) => updateSmtp({ secure: v })} />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>ID per tracking. Lo script viene iniettato automaticamente.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 max-w-2xl">
                <Field label="Google Analytics 4 ID"><Input value={data.integrations.ga4Id} onChange={(e) => updateIntegrations('ga4Id', e.target.value)} placeholder="G-XXXXXXX" /></Field>
                <Field label="Google Tag Manager ID"><Input value={data.integrations.gtmId} onChange={(e) => updateIntegrations('gtmId', e.target.value)} placeholder="GTM-XXXXXXX" /></Field>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== CODE ===== */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cookie className="h-4 w-4 text-primary" /> Banner cookie</CardTitle>
              <CardDescription>
                Banner di consenso nativo: mostra Accetta/Rifiuta e sblocca i contenuti di terze parti
                (widget HTML con &ldquo;Richiedi consenso cookie&rdquo;). Lo stato è salvato nel browser del visitatore.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              {(() => {
                const cb = (data.integrations.cookieBanner ?? {}) as Record<string, unknown>;
                const up = (k: string, v: unknown) => updateIntegrations('cookieBanner', { ...cb, [k]: v });
                return (
                  <>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" checked={!!cb.enabled} onChange={(e) => up('enabled', e.target.checked)} />
                      Banner attivo
                    </label>
                    <Field label="Titolo"><Input value={(cb.title as string) ?? 'Cookie'} onChange={(e) => up('title', e.target.value)} /></Field>
                    <Field label="Messaggio"><Input value={(cb.message as string) ?? ''} onChange={(e) => up('message', e.target.value)} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Etichetta Accetta"><Input value={(cb.acceptLabel as string) ?? 'Accetta'} onChange={(e) => up('acceptLabel', e.target.value)} /></Field>
                      <Field label="Etichetta Rifiuta"><Input value={(cb.declineLabel as string) ?? 'Rifiuta'} onChange={(e) => up('declineLabel', e.target.value)} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Link privacy policy"><Input value={(cb.policyUrl as string) ?? '/privacy'} onChange={(e) => up('policyUrl', e.target.value)} /></Field>
                      <Field label="Link cookie policy (facoltativo)"><Input value={(cb.cookiePolicyUrl as string) ?? ''} onChange={(e) => up('cookiePolicyUrl', e.target.value)} /></Field>
                    </div>
                    <Field label="Posizione">
                      <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={(cb.position as string) ?? 'bottom-bar'} onChange={(e) => up('position', e.target.value)}>
                        <option value="bottom-bar">Barra in basso</option>
                        <option value="bottom-left">Card in basso a sinistra</option>
                        <option value="bottom-right">Card in basso a destra</option>
                      </select>
                    </Field>
                    <p className="text-xs text-muted-foreground pt-2">Varianti inglesi (facoltative, usate sui percorsi /en):</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Titolo EN"><Input value={(cb.titleEn as string) ?? ''} onChange={(e) => up('titleEn', e.target.value)} /></Field>
                      <Field label="Link privacy EN"><Input value={(cb.policyUrlEn as string) ?? ''} onChange={(e) => up('policyUrlEn', e.target.value)} /></Field>
                      <Field label="Link cookie policy EN"><Input value={(cb.cookiePolicyUrlEn as string) ?? ''} onChange={(e) => up('cookiePolicyUrlEn', e.target.value)} /></Field>
                    </div>
                    <Field label="Messaggio EN"><Input value={(cb.messageEn as string) ?? ''} onChange={(e) => up('messageEn', e.target.value)} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Accetta EN"><Input value={(cb.acceptLabelEn as string) ?? ''} onChange={(e) => up('acceptLabelEn', e.target.value)} /></Field>
                      <Field label="Rifiuta EN"><Input value={(cb.declineLabelEn as string) ?? ''} onChange={(e) => up('declineLabelEn', e.target.value)} /></Field>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2">Aspetto: vuoto = eredita dal tema del sito.</p>
                    <div className="grid grid-cols-4 gap-3">
                      <Field label="Sfondo"><Input value={(cb.bgColor as string) ?? ''} onChange={(e) => up('bgColor', e.target.value)} placeholder="tema" /></Field>
                      <Field label="Testo"><Input value={(cb.textColor as string) ?? ''} onChange={(e) => up('textColor', e.target.value)} placeholder="tema" /></Field>
                      <Field label="Accento"><Input value={(cb.accentColor as string) ?? ''} onChange={(e) => up('accentColor', e.target.value)} placeholder="primario" /></Field>
                      <Field label="Raggio"><Input value={(cb.radius as string) ?? ''} onChange={(e) => up('radius', e.target.value)} placeholder="14px" /></Field>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code">
          <Card>
            <CardHeader>
              <CardTitle>Codice personalizzato</CardTitle>
              <CardDescription>CSS site-wide e script per analytics, pixel, GTM.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field label="Custom CSS" help="Iniettato in tutto il sito dopo le variabili tema.">
                <Textarea
                  rows={10}
                  className="font-mono text-xs"
                  value={data.customCss ?? ''}
                  onChange={(e) => update('customCss', e.target.value || null)}
                  placeholder=".my-class { color: red; }"
                />
              </Field>
              <Field label="Head scripts" help="Iniettato dentro <head>. Ideale per Google Analytics, Pixel, Search Console.">
                <Textarea
                  rows={6}
                  className="font-mono text-xs"
                  value={data.headScripts ?? ''}
                  onChange={(e) => update('headScripts', e.target.value || null)}
                  placeholder="<!-- GA4 -->&#10;<script src='https://www.googletagmanager.com/gtag/js?id=G-XXX'></script>"
                />
              </Field>
              <Field label="Body scripts" help="Iniettato a fine <body>. Per chat, widget, tracking.">
                <Textarea
                  rows={6}
                  className="font-mono text-xs"
                  value={data.bodyScripts ?? ''}
                  onChange={(e) => update('bodyScripts', e.target.value || null)}
                  placeholder="<script>/* il tuo codice */</script>"
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ADVANCED ===== */}
        <TabsContent value="advanced">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Accesso al sito</CardTitle>
              <CardDescription>
                Con &ldquo;Manutenzione&rdquo; o &ldquo;Protetto da password&rdquo; il sito NON viene indicizzato
                (meta robots noindex + robots.txt Disallow) e gli admin loggati vedono sempre tutto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              {(() => {
                const sa = (data.integrations.siteAccess ?? {}) as Record<string, unknown>;
                const up = (k: string, v: unknown) => updateIntegrations('siteAccess', { ...sa, [k]: v });
                return (
                  <>
                    <Field label="Modalità">
                      <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              value={(sa.mode as string) ?? 'public'}
                              onChange={(e) => { up('mode', e.target.value); update('maintenance', e.target.value === 'maintenance'); }}>
                        <option value="public">Pubblico (online e indicizzabile)</option>
                        <option value="password">Protetto da password (anteprima per il cliente)</option>
                        <option value="maintenance">Manutenzione (pagina di cortesia)</option>
                      </select>
                    </Field>
                    {((sa.mode as string) ?? 'public') === 'password' && (
                      <>
                        <Field label="Password di anteprima" help="Chi la inserisce naviga il sito per 7 giorni.">
                          <Input value={(sa.password as string) ?? ''} onChange={(e) => up('password', e.target.value)} placeholder="es. anteprima2026" />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Titolo schermata"><Input value={(sa.lockTitle as string) ?? ''} onChange={(e) => up('lockTitle', e.target.value)} placeholder="Sito in costruzione" /></Field>
                          <Field label="Messaggio schermata"><Input value={(sa.lockMessage as string) ?? ''} onChange={(e) => up('lockMessage', e.target.value)} placeholder="Inserisci la password…" /></Field>
                        </div>
                      </>
                    )}
                    {((sa.mode as string) ?? 'public') === 'maintenance' && (
                      <Field label="Messaggio di manutenzione" help="Mostrato al posto del sito.">
                        <Textarea rows={3} value={data.maintenanceMessage ?? ''}
                                  onChange={(e) => update('maintenanceMessage', e.target.value || null)}
                                  placeholder="Stiamo facendo manutenzione. Torneremo presto." />
                      </Field>
                    )}
                    {((sa.mode as string) ?? 'public') === 'public' && (
                      <p className="text-sm text-muted-foreground">Il sito è online, indicizzabile e visibile a tutti.</p>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-8 -mb-8 px-8 py-3 bg-card border-t flex items-center justify-end gap-3 z-20">
        <p className="text-xs text-muted-foreground mr-auto">Le modifiche si applicano immediatamente a tutto il sito.</p>
        <Button variant="outline" onClick={reset} disabled={pending}><RotateCcw className="h-4 w-4" />Annulla</Button>
        <Button onClick={save} disabled={pending} size="lg">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salva
        </Button>
      </div>
    </>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {help && <p className="text-[10px] text-muted-foreground">{help}</p>}
    </div>
  );
}

function ColorPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded border cursor-pointer" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 font-mono text-xs" />
    </div>
  );
}

function ColorGroup({
  title,
  colors,
  value,
  onChange,
}: {
  title: string;
  colors: { key: keyof Theme['colors']; label: string }[];
  value: Theme['colors'];
  onChange: (patch: Partial<Theme['colors']>) => void;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3">{title}</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {colors.map((c) => (
          <Field key={String(c.key)} label={c.label}>
            <ColorPick value={value[c.key]} onChange={(v) => onChange({ [c.key]: v })} />
          </Field>
        ))}
      </div>
    </div>
  );
}
