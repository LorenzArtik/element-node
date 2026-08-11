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
import { t } from '@/lib/admin-i18n';

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
          throw new Error(err?.error?.message ?? t('Errore salvataggio', 'Save error'));
        }
        const fresh = await res.json();
        setData(fresh);
        toast.success(t('Impostazioni salvate', 'Settings saved'));
        router.refresh();
      } catch (e) {
        toast.error(t('Errore', 'Error'), { description: (e as Error).message });
      }
    });
  }

  function reset() {
    setData(initial);
    toast.info(t('Modifiche annullate', 'Changes discarded'));
  }

  return (
    <>
      <Tabs defaultValue={defaultTab || 'brand'}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="brand"><ImageIcon className="h-3.5 w-3.5 mr-1" />Brand</TabsTrigger>
          <TabsTrigger value="colors"><Palette className="h-3.5 w-3.5 mr-1" />{t('Colori', 'Colors')}</TabsTrigger>
          <TabsTrigger value="typography"><Type className="h-3.5 w-3.5 mr-1" />Font</TabsTrigger>
          <TabsTrigger value="layout"><Layout className="h-3.5 w-3.5 mr-1" />Layout</TabsTrigger>
          <TabsTrigger value="buttons"><MousePointerClick className="h-3.5 w-3.5 mr-1" />Buttons</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="h-3.5 w-3.5 mr-1" />API</TabsTrigger>
          <TabsTrigger value="privacy"><Cookie className="h-3.5 w-3.5 mr-1" />Privacy</TabsTrigger>
          <TabsTrigger value="code"><Code2 className="h-3.5 w-3.5 mr-1" />{t('Codice', 'Code')}</TabsTrigger>
          <TabsTrigger value="advanced"><Wrench className="h-3.5 w-3.5 mr-1" />{t('Avanzate', 'Advanced')}</TabsTrigger>
        </TabsList>

        {/* ===== BRAND ===== */}
        <TabsContent value="brand">
          <Card>
            <CardHeader>
              <CardTitle>{t('Identità del sito', 'Site identity')}</CardTitle>
              <CardDescription>{t('Nome, logo, favicon. Usati ovunque nel sito e nel backoffice.', 'Name, logo, favicon. Used everywhere on the site and in the back office.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-2xl">
              <Field label={t('Nome del sito', 'Site name')}>
                <Input value={data.name} onChange={(e) => update('name', e.target.value)} />
              </Field>
              <Field label={t('Tagline / sottotitolo', 'Tagline / subtitle')}>
                <Input value={data.tagline ?? ''} onChange={(e) => update('tagline', e.target.value || null)} placeholder={t('Il tuo claim breve', 'Your short claim')} />
              </Field>
              <Field label="Logo (light)" help={t("Logo per sfondi chiari. Usato nell'header di default.", 'Logo for light backgrounds. Used in the default header.')}>
                <MediaField value={data.logoLight ?? ''} onChange={(v) => update('logoLight', v || null)} />
              </Field>
              <Field label="Logo (dark)" help={t('Logo per sfondi scuri.', 'Logo for dark backgrounds.')}>
                <MediaField value={data.logoDark ?? ''} onChange={(v) => update('logoDark', v || null)} />
              </Field>
              <Field label="Favicon" help={t('32x32 o 64x64 PNG/ICO', '32x32 or 64x64 PNG/ICO')}>
                <MediaField value={data.favicon ?? ''} onChange={(v) => update('favicon', v || null)} />
              </Field>
              <Field label={t('Lingua di default', 'Default language')}>
                <Input value={data.defaultLocale} onChange={(e) => update('defaultLocale', e.target.value)} placeholder="it" />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== COLORI ===== */}
        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle>{t('Palette colori', 'Color palette')}</CardTitle>
              <CardDescription>{t('Definisci la tua palette. Tutti i widget useranno automaticamente questi colori.', 'Define your palette. All widgets will automatically use these colors.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ColorGroup title="Brand" colors={[
                { key: 'primary', label: t('Primario', 'Primary') },
                { key: 'primaryHover', label: t('Primario hover', 'Primary hover') },
                { key: 'secondary', label: t('Secondario', 'Secondary') },
                { key: 'accent', label: 'Accent' },
              ]} value={data.theme.colors} onChange={(p) => updateTheme('colors', p)} />

              <ColorGroup title={t('Testo', 'Text')} colors={[
                { key: 'text', label: t('Testo principale', 'Main text') },
                { key: 'textMuted', label: t('Testo secondario', 'Muted text') },
                { key: 'textInverse', label: t('Testo su sfondi scuri', 'Text on dark backgrounds') },
              ]} value={data.theme.colors} onChange={(p) => updateTheme('colors', p)} />

              <ColorGroup title={t('Sfondi', 'Backgrounds')} colors={[
                { key: 'background', label: t('Sfondo pagina', 'Page background') },
                { key: 'surface', label: t('Sfondo card / surface', 'Card / surface background') },
                { key: 'border', label: t('Bordi', 'Borders') },
              ]} value={data.theme.colors} onChange={(p) => updateTheme('colors', p)} />

              <ColorGroup title="Status" colors={[
                { key: 'success', label: t('Successo', 'Success') },
                { key: 'warning', label: t('Attenzione', 'Warning') },
                { key: 'danger', label: t('Errore', 'Error') },
                { key: 'info', label: 'Info' },
              ]} value={data.theme.colors} onChange={(p) => updateTheme('colors', p)} />

              <ColorGroup title={t('Personalizzati', 'Custom')} colors={[
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
              <CardTitle>{t('Tipografia', 'Typography')}</CardTitle>
              <CardDescription>{t("Cerca e seleziona Google Fonts (caricati on-demand). Anche l'AI userà questi font quando genera contenuti.", 'Search and select Google Fonts (loaded on-demand). The AI will also use these fonts when generating content.')}</CardDescription>
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
                <Field label={t('Dimensione base', 'Base size')}>
                  <Input value={data.theme.typography.sizeBase} onChange={(e) => updateTheme('typography', { sizeBase: e.target.value })} />
                </Field>
                <Field label={t('Interlinea body', 'Body line height')}>
                  <Input value={data.theme.typography.lineHeight} onChange={(e) => updateTheme('typography', { lineHeight: e.target.value })} />
                </Field>
                <Field label={t('Peso headings', 'Heading weight')}>
                  <Input value={data.theme.typography.headingWeight} onChange={(e) => updateTheme('typography', { headingWeight: e.target.value })} />
                </Field>
                <Field label={t('Peso body', 'Body weight')}>
                  <Input value={data.theme.typography.bodyWeight} onChange={(e) => updateTheme('typography', { bodyWeight: e.target.value })} />
                </Field>
              </div>

              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold mb-3">{t('Scala dimensioni', 'Size scale')}</h4>
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
              <CardDescription>{t('Dimensioni del container, breakpoint responsive, padding sezioni di default.', 'Container size, responsive breakpoints, default section padding.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('Larghezza max contenitore', 'Max container width')}><Input value={data.theme.layout.containerMax} onChange={(e) => updateTheme('layout', { containerMax: e.target.value })} /></Field>
                <Field label={t('Gutter (gap colonne)', 'Gutter (column gap)')}><Input value={data.theme.layout.gutter} onChange={(e) => updateTheme('layout', { gutter: e.target.value })} /></Field>
                <Field label="Breakpoint Tablet"><Input value={data.theme.layout.breakpointTablet} onChange={(e) => updateTheme('layout', { breakpointTablet: e.target.value })} /></Field>
                <Field label="Breakpoint Mobile"><Input value={data.theme.layout.breakpointMobile} onChange={(e) => updateTheme('layout', { breakpointMobile: e.target.value })} /></Field>
              </div>
              <Field label={t('Padding default sezioni', 'Default section padding')}><Input value={data.theme.layout.sectionPadding} onChange={(e) => updateTheme('layout', { sectionPadding: e.target.value })} /></Field>

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
              <CardTitle>{t('Stile pulsanti', 'Button style')}</CardTitle>
              <CardDescription>{t('Look globale dei bottoni. Si applica a tutti i widget Button e ai CTA.', 'Global button look. Applies to all Button widgets and CTAs.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 max-w-2xl">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Border radius"><Input value={data.theme.buttons.radius} onChange={(e) => updateTheme('buttons', { radius: e.target.value })} /></Field>
                <Field label={t('Padding orizzontale', 'Horizontal padding')}><Input value={data.theme.buttons.paddingX} onChange={(e) => updateTheme('buttons', { paddingX: e.target.value })} /></Field>
                <Field label={t('Padding verticale', 'Vertical padding')}><Input value={data.theme.buttons.paddingY} onChange={(e) => updateTheme('buttons', { paddingY: e.target.value })} /></Field>
                <Field label={t('Peso testo', 'Text weight')}><Input value={data.theme.buttons.fontWeight} onChange={(e) => updateTheme('buttons', { fontWeight: e.target.value })} /></Field>
              </div>

              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold mb-3">Form inputs</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Border radius"><Input value={data.theme.forms.radius} onChange={(e) => updateTheme('forms', { radius: e.target.value })} /></Field>
                  <Field label={t('Colore bordo', 'Border color')}><ColorPick value={data.theme.forms.borderColor} onChange={(v) => updateTheme('forms', { borderColor: v })} /></Field>
                  <Field label={t('Colore focus', 'Focus color')}><ColorPick value={data.theme.forms.focusColor} onChange={(v) => updateTheme('forms', { focusColor: v })} /></Field>
                  <Field label={t('Sfondo', 'Background')}><ColorPick value={data.theme.forms.background} onChange={(v) => updateTheme('forms', { background: v })} /></Field>
                </div>
              </div>

              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold mb-3">{t('Anteprima', 'Preview')}</h4>
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
                  <input placeholder={t('Esempio input', 'Example input')} style={{
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
                <CardTitle className="flex items-center gap-2"><Key className="h-4 w-4 text-primary" /> {t('Licenza Element Node', 'Element Node license')}</CardTitle>
                <CardDescription>
                  {t('La licenza attiva aggiornamenti gestiti, patch di sicurezza e supporto.', 'The license enables managed updates, security patches and support.')}{' '}
                  <a href="/admin/license" className="font-medium underline underline-offset-2">{t('Gestiscila dalla pagina Licenza →', 'Manage it on the License page →')}</a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <Field label={t('Chiave di licenza', 'License key')} help={t("Formato enl_XXXX-XXXX-XXXX-XXXX — la ricevi via email dopo l'acquisto. La validazione avviene automaticamente entro qualche minuto dal salvataggio.", 'Format enl_XXXX-XXXX-XXXX-XXXX — you receive it by email after purchase. Validation happens automatically within a few minutes of saving.')}>
                  <Input value={data.integrations.licenseKey ?? ''} onChange={(e) => updateIntegrations('licenseKey', e.target.value.trim())} placeholder="enl_XXXX-XXXX-XXXX-XXXX" />
                </Field>
                {data.integrations.licenseCache?.checkedAt ? (
                  <p className="text-xs text-muted-foreground">
                    {t('Stato:', 'Status:')} {data.integrations.licenseCache.valid
                      ? t(`✓ attiva (${data.integrations.licenseCache.plan})`, `✓ active (${data.integrations.licenseCache.plan})`)
                      : t(`non attiva${data.integrations.licenseCache.reason ? ` — ${data.integrations.licenseCache.reason}` : ''}`, `not active${data.integrations.licenseCache.reason ? ` — ${data.integrations.licenseCache.reason}` : ''}`)}
                    {' · '}{t('ultimo controllo', 'last check')} {new Date(data.integrations.licenseCache.checkedAt).toLocaleString('it-IT')}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <UpdaterCard />

            <SkillCard licenseKey={data.integrations.licenseKey ?? ''} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Anthropic (Claude)</CardTitle>
                <CardDescription>{t('Override delle credenziali del file', 'Overrides the credentials from the')} <code>.env</code>{t(". Lascia vuoto per usare i valori dell'ambiente.", ' file. Leave empty to use the environment values.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <Field label="ANTHROPIC_API_KEY">
                  <Input type="password" value={data.integrations.anthropicApiKey} onChange={(e) => updateIntegrations('anthropicApiKey', e.target.value)} placeholder="sk-ant-..." />
                </Field>
                <Field label={t('Modello (lascia vuoto per default: claude-sonnet-5)', 'Model (leave empty for default: claude-sonnet-5)')} help={t('claude-sonnet-5 = qualità/prezzo consigliato · claude-opus-4-8 = massima qualità · claude-haiku-4-5 = il più economico', 'claude-sonnet-5 = recommended quality/price · claude-opus-4-8 = highest quality · claude-haiku-4-5 = cheapest')}>
                  <>
                    <Input list="anthropic-models" value={data.integrations.anthropicModel} onChange={(e) => updateIntegrations('anthropicModel', e.target.value)} placeholder="claude-sonnet-5" />
                    <datalist id="anthropic-models">
                      <option value="claude-sonnet-5" />
                      <option value="claude-opus-4-8" />
                      <option value="claude-haiku-4-5" />
                    </datalist>
                  </>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-500" /> Google reCAPTCHA v3</CardTitle>
                <CardDescription>{t('Protegge dai bot. Genera le chiavi su', 'Protects from bots. Generate the keys at')} <code>google.com/recaptcha</code>{t('. Threshold consigliato 0.5.', '. Recommended threshold 0.5.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <Field label={t('Site Key (pubblica)', 'Site Key (public)')}>
                  <Input value={data.integrations.recaptcha.siteKey} onChange={(e) => updateRecaptcha({ siteKey: e.target.value })} placeholder="6Lc..." />
                </Field>
                <Field label="Secret Key (server)">
                  <Input type="password" value={data.integrations.recaptcha.secretKey} onChange={(e) => updateRecaptcha({ secretKey: e.target.value })} placeholder="6Lc..." />
                </Field>
                <Field label={`Threshold: ${data.integrations.recaptcha.threshold}`} help={t('Se score < threshold la richiesta è bloccata. 0=permissivo, 1=strict.', 'If score < threshold the request is blocked. 0=permissive, 1=strict.')}>
                  <input type="range" min={0} max={1} step={0.05} value={data.integrations.recaptcha.threshold} onChange={(e) => updateRecaptcha({ threshold: Number(e.target.value) })} className="w-full" />
                </Field>
                <div>
                  <Label className="text-xs">{t('Abilita su', 'Enable on')}</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">{t('Spunta dove vuoi attivare la protezione bot. Disabilitato finché non ci sono Site Key e Secret.', 'Check where you want to enable bot protection. Disabled until Site Key and Secret are set.')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {recaptchaScopeKeys.map((scope) => {
                      const labels: Record<string, string> = { forms: t('Form', 'Forms'), login: 'Login', register: t('Registrazione', 'Registration'), 'forgot-password': t('Password dimenticata', 'Forgot password') };
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
                <CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-500" /> {t('Email transazionali', 'Transactional email')}</CardTitle>
                <CardDescription>
                  {t('Scegli come inviare email (verifica account, reset password, contatti form). In modalità', 'Choose how to send email (account verification, password reset, form contacts). In')} <b>Console</b> {t('le email vengono solo loggate nel terminale (utile in sviluppo, NON usare in produzione).', 'mode, emails are only logged to the terminal (useful in development, do NOT use in production).')}
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
                      <SelectItem value="console">{t('Console (solo log, sviluppo)', 'Console (log only, development)')}</SelectItem>
                      <SelectItem value="smtp">{t('SMTP (server email proprio)', 'SMTP (your own email server)')}</SelectItem>
                      <SelectItem value="brevo">{t('Brevo (ex Sendinblue, API key)', 'Brevo (formerly Sendinblue, API key)')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    {t('Se lasci "Console" ma compili Brevo o SMTP, il provider viene auto-rilevato.', 'If you leave "Console" but fill in Brevo or SMTP, the provider is auto-detected.')}
                  </p>
                </div>

                {data.integrations.emailProvider === 'brevo' && (
                  <div className="space-y-3 p-3 border rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      {t('📨 Brevo (consigliato)', '📨 Brevo (recommended)')}
                    </div>
                    <Field label="API Key">
                      <Input type="password" value={data.integrations.brevo.apiKey} onChange={(e) => updateBrevo({ apiKey: e.target.value })} placeholder="xkeysib-..." />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="From email">
                        <Input value={data.integrations.brevo.fromEmail} onChange={(e) => updateBrevo({ fromEmail: e.target.value })} placeholder={t('noreply@tuosito.it', 'noreply@yoursite.com')} />
                      </Field>
                      <Field label="From name">
                        <Input value={data.integrations.brevo.fromName} onChange={(e) => updateBrevo({ fromName: e.target.value })} placeholder="Element Node" />
                      </Field>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {t('Genera la API key su', 'Generate the API key at')} <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" className="text-primary hover:underline">app.brevo.com/settings/keys/api</a>{t('. Il dominio mittente deve essere verificato.', '. The sender domain must be verified.')}
                    </p>
                  </div>
                )}

                {data.integrations.emailProvider === 'smtp' && (
                  <div className="space-y-3 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                      {t('📡 SMTP (server email)', '📡 SMTP (email server)')}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {t('Richiede', 'Requires')} <code>npm i nodemailer</code>{t('. Override del .env: lascia vuoto per usare le env', '. Overrides .env: leave empty to use the')} <code>SMTP_*</code>{t('.', ' env vars.')}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Host"><Input value={data.integrations.smtp.host} onChange={(e) => updateSmtp({ host: e.target.value })} placeholder="smtp.gmail.com" /></Field>
                      <Field label="Port"><Input value={data.integrations.smtp.port} onChange={(e) => updateSmtp({ port: e.target.value })} placeholder="587" /></Field>
                      <Field label="User"><Input value={data.integrations.smtp.user} onChange={(e) => updateSmtp({ user: e.target.value })} /></Field>
                      <Field label="Password"><Input type="password" value={data.integrations.smtp.pass} onChange={(e) => updateSmtp({ pass: e.target.value })} /></Field>
                      <Field label="From"><Input value={data.integrations.smtp.from} onChange={(e) => updateSmtp({ from: e.target.value })} placeholder={t('"Site" <noreply@dominio.it>', '"Site" <noreply@domain.com>')} /></Field>
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
                <CardDescription>{t('ID per tracking. Lo script viene iniettato automaticamente.', 'IDs for tracking. The script is injected automatically.')}</CardDescription>
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
              <CardTitle className="flex items-center gap-2"><Cookie className="h-4 w-4 text-primary" /> {t('Banner cookie', 'Cookie banner')}</CardTitle>
              <CardDescription>
                {t('Banner di consenso nativo: mostra Accetta/Rifiuta e sblocca i contenuti di terze parti (widget HTML con "Richiedi consenso cookie"). Lo stato è salvato nel browser del visitatore.', 'Native consent banner: shows Accept/Decline and unblocks third-party content (HTML widgets with "Require cookie consent"). The state is saved in the visitor\'s browser.')}
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
                      {t('Banner attivo', 'Banner enabled')}
                    </label>
                    <Field label={t('Titolo', 'Title')}><Input value={(cb.title as string) ?? 'Cookie'} onChange={(e) => up('title', e.target.value)} /></Field>
                    <Field label={t('Messaggio', 'Message')}><Input value={(cb.message as string) ?? ''} onChange={(e) => up('message', e.target.value)} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t('Etichetta Accetta', 'Accept label')}><Input value={(cb.acceptLabel as string) ?? 'Accetta'} onChange={(e) => up('acceptLabel', e.target.value)} /></Field>
                      <Field label={t('Etichetta Rifiuta', 'Decline label')}><Input value={(cb.declineLabel as string) ?? 'Rifiuta'} onChange={(e) => up('declineLabel', e.target.value)} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t('Link privacy policy', 'Privacy policy link')}><Input value={(cb.policyUrl as string) ?? '/privacy'} onChange={(e) => up('policyUrl', e.target.value)} /></Field>
                      <Field label={t('Link cookie policy (facoltativo)', 'Cookie policy link (optional)')}><Input value={(cb.cookiePolicyUrl as string) ?? ''} onChange={(e) => up('cookiePolicyUrl', e.target.value)} /></Field>
                    </div>
                    <Field label={t('Posizione', 'Position')}>
                      <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={(cb.position as string) ?? 'bottom-bar'} onChange={(e) => up('position', e.target.value)}>
                        <option value="bottom-bar">{t('Barra in basso', 'Bottom bar')}</option>
                        <option value="bottom-left">{t('Card in basso a sinistra', 'Bottom-left card')}</option>
                        <option value="bottom-right">{t('Card in basso a destra', 'Bottom-right card')}</option>
                      </select>
                    </Field>
                    <p className="text-xs text-muted-foreground pt-2">{t('Varianti inglesi (facoltative, usate sui percorsi /en):', 'English variants (optional, used on /en paths):')}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t('Titolo EN', 'Title EN')}><Input value={(cb.titleEn as string) ?? ''} onChange={(e) => up('titleEn', e.target.value)} /></Field>
                      <Field label={t('Link privacy EN', 'Privacy link EN')}><Input value={(cb.policyUrlEn as string) ?? ''} onChange={(e) => up('policyUrlEn', e.target.value)} /></Field>
                      <Field label={t('Link cookie policy EN', 'Cookie policy link EN')}><Input value={(cb.cookiePolicyUrlEn as string) ?? ''} onChange={(e) => up('cookiePolicyUrlEn', e.target.value)} /></Field>
                    </div>
                    <Field label={t('Messaggio EN', 'Message EN')}><Input value={(cb.messageEn as string) ?? ''} onChange={(e) => up('messageEn', e.target.value)} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t('Accetta EN', 'Accept EN')}><Input value={(cb.acceptLabelEn as string) ?? ''} onChange={(e) => up('acceptLabelEn', e.target.value)} /></Field>
                      <Field label={t('Rifiuta EN', 'Decline EN')}><Input value={(cb.declineLabelEn as string) ?? ''} onChange={(e) => up('declineLabelEn', e.target.value)} /></Field>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2">{t('Aspetto: vuoto = eredita dal tema del sito.', 'Appearance: empty = inherits from the site theme.')}</p>
                    <div className="grid grid-cols-4 gap-3">
                      <Field label={t('Sfondo', 'Background')}><Input value={(cb.bgColor as string) ?? ''} onChange={(e) => up('bgColor', e.target.value)} placeholder={t('tema', 'theme')} /></Field>
                      <Field label={t('Testo', 'Text')}><Input value={(cb.textColor as string) ?? ''} onChange={(e) => up('textColor', e.target.value)} placeholder={t('tema', 'theme')} /></Field>
                      <Field label={t('Accento', 'Accent')}><Input value={(cb.accentColor as string) ?? ''} onChange={(e) => up('accentColor', e.target.value)} placeholder={t('primario', 'primary')} /></Field>
                      <Field label={t('Raggio', 'Radius')}><Input value={(cb.radius as string) ?? ''} onChange={(e) => up('radius', e.target.value)} placeholder="14px" /></Field>
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
              <CardTitle>{t('Codice personalizzato', 'Custom code')}</CardTitle>
              <CardDescription>{t('CSS site-wide e script per analytics, pixel, GTM.', 'Site-wide CSS and scripts for analytics, pixels, GTM.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field label="Custom CSS" help={t('Iniettato in tutto il sito dopo le variabili tema.', 'Injected site-wide after the theme variables.')}>
                <Textarea
                  rows={10}
                  className="font-mono text-xs"
                  value={data.customCss ?? ''}
                  onChange={(e) => update('customCss', e.target.value || null)}
                  placeholder=".my-class { color: red; }"
                />
              </Field>
              <Field label="Head scripts" help={t('Iniettato dentro <head>. Ideale per Google Analytics, Pixel, Search Console.', 'Injected inside <head>. Ideal for Google Analytics, Pixel, Search Console.')}>
                <Textarea
                  rows={6}
                  className="font-mono text-xs"
                  value={data.headScripts ?? ''}
                  onChange={(e) => update('headScripts', e.target.value || null)}
                  placeholder="<!-- GA4 -->&#10;<script src='https://www.googletagmanager.com/gtag/js?id=G-XXX'></script>"
                />
              </Field>
              <Field label="Body scripts" help={t('Iniettato a fine <body>. Per chat, widget, tracking.', 'Injected at the end of <body>. For chat, widgets, tracking.')}>
                <Textarea
                  rows={6}
                  className="font-mono text-xs"
                  value={data.bodyScripts ?? ''}
                  onChange={(e) => update('bodyScripts', e.target.value || null)}
                  placeholder={t('<script>/* il tuo codice */</script>', '<script>/* your code */</script>')}
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ADVANCED ===== */}
        <TabsContent value="advanced">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> {t('Accesso al sito', 'Site access')}</CardTitle>
              <CardDescription>
                {t('Con "Manutenzione" o "Protetto da password" il sito NON viene indicizzato (meta robots noindex + robots.txt Disallow) e gli admin loggati vedono sempre tutto.', 'With "Maintenance" or "Password protected" the site is NOT indexed (meta robots noindex + robots.txt Disallow) and logged-in admins always see everything.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              {(() => {
                const sa = (data.integrations.siteAccess ?? {}) as Record<string, unknown>;
                const up = (k: string, v: unknown) => updateIntegrations('siteAccess', { ...sa, [k]: v });
                return (
                  <>
                    <Field label={t('Modalità', 'Mode')}>
                      <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              value={(sa.mode as string) ?? 'public'}
                              onChange={(e) => { up('mode', e.target.value); update('maintenance', e.target.value === 'maintenance'); }}>
                        <option value="public">{t('Pubblico (online e indicizzabile)', 'Public (online and indexable)')}</option>
                        <option value="password">{t('Protetto da password (anteprima per il cliente)', 'Password protected (client preview)')}</option>
                        <option value="maintenance">{t('Manutenzione (pagina di cortesia)', 'Maintenance (holding page)')}</option>
                      </select>
                    </Field>
                    {((sa.mode as string) ?? 'public') === 'password' && (
                      <>
                        <Field label={t('Password di anteprima', 'Preview password')} help={t('Chi la inserisce naviga il sito per 7 giorni.', 'Anyone who enters it can browse the site for 7 days.')}>
                          <Input value={(sa.password as string) ?? ''} onChange={(e) => up('password', e.target.value)} placeholder={t('es. anteprima2026', 'e.g. preview2026')} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label={t('Titolo schermata', 'Screen title')}><Input value={(sa.lockTitle as string) ?? ''} onChange={(e) => up('lockTitle', e.target.value)} placeholder={t('Sito in costruzione', 'Site under construction')} /></Field>
                          <Field label={t('Messaggio schermata', 'Screen message')}><Input value={(sa.lockMessage as string) ?? ''} onChange={(e) => up('lockMessage', e.target.value)} placeholder={t('Inserisci la password…', 'Enter the password…')} /></Field>
                        </div>
                      </>
                    )}
                    {((sa.mode as string) ?? 'public') === 'maintenance' && (
                      <Field label={t('Messaggio di manutenzione', 'Maintenance message')} help={t('Mostrato al posto del sito.', 'Shown instead of the site.')}>
                        <Textarea rows={3} value={data.maintenanceMessage ?? ''}
                                  onChange={(e) => update('maintenanceMessage', e.target.value || null)}
                                  placeholder={t('Stiamo facendo manutenzione. Torneremo presto.', 'We are performing maintenance. We will be back soon.')} />
                      </Field>
                    )}
                    {((sa.mode as string) ?? 'public') === 'public' && (
                      <p className="text-sm text-muted-foreground">{t('Il sito è online, indicizzabile e visibile a tutti.', 'The site is online, indexable and visible to everyone.')}</p>
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
        <p className="text-xs text-muted-foreground mr-auto">{t('Le modifiche si applicano immediatamente a tutto il sito.', 'Changes apply immediately to the entire site.')}</p>
        <Button variant="outline" onClick={reset} disabled={pending}><RotateCcw className="h-4 w-4" />{t('Annulla', 'Cancel')}</Button>
        <Button onClick={save} disabled={pending} size="lg">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t('Salva', 'Save')}
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
