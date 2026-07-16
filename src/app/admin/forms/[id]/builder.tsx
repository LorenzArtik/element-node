'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Plus, Trash2, GripVertical, Copy, Code2, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { FormField, FormAction, FormSettings } from '@/lib/forms';
import { fieldTypes } from '@/lib/forms';

interface InitialState {
  name: string;
  description: string;
  fields: FormField[];
  actions: FormAction[];
  settings: FormSettings;
  recipients: string;
  status: string;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Testo', email: 'Email', tel: 'Telefono', url: 'URL',
  number: 'Numero', textarea: 'Area di testo', select: 'Select',
  radio: 'Radio button', checkbox: 'Checkbox', 'checkbox-group': 'Checkbox multipli',
  date: 'Data', time: 'Ora', file: 'File', hidden: 'Nascosto', consent: 'Consenso GDPR',
};

export function FormBuilder({ id, initial }: { id: string; initial: InitialState }) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [fields, setFields] = useState<FormField[]>(initial.fields);
  const [actions, setActions] = useState<FormAction[]>(initial.actions);
  const [settings, setSettings] = useState<FormSettings>(initial.settings);
  const [status, setStatus] = useState(initial.status);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    start(async () => {
      const res = await fetch(`/api/forms/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, description, fields, actions, settings, status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error('Errore', { description: err?.error?.message });
        return;
      }
      toast.success('Salvato');
      router.refresh();
    });
  }

  function addField() {
    const id = `f_${Math.random().toString(36).slice(2, 8)}`;
    setFields([...fields, {
      id, type: 'text', name: `field_${fields.length + 1}`, label: 'Nuovo campo',
      required: false, width: 12,
    }]);
  }

  function updateField(idx: number, patch: Partial<FormField>) {
    setFields(fields.map((f, i) => i === idx ? { ...f, ...patch } : f));
  }
  function removeField(idx: number) {
    setFields(fields.filter((_, i) => i !== idx));
  }
  function duplicateField(idx: number) {
    const f = fields[idx];
    const clone = { ...f, id: `f_${Math.random().toString(36).slice(2, 8)}`, name: `${f.name}_copy` };
    setFields([...fields.slice(0, idx + 1), clone, ...fields.slice(idx + 1)]);
  }
  function moveField(idx: number, dir: 'up' | 'down') {
    const next = [...fields];
    const tgt = dir === 'up' ? idx - 1 : idx + 1;
    if (tgt < 0 || tgt >= next.length) return;
    [next[idx], next[tgt]] = [next[tgt], next[idx]];
    setFields(next);
  }

  function addAction(type: FormAction['type']) {
    const base: FormAction =
      type === 'email' ? { type, to: '', subject: 'Submission da {form}' }
      : type === 'autoresponder' ? { type, toField: 'email', subject: 'Grazie!', body: 'Abbiamo ricevuto la tua richiesta.' }
      : type === 'webhook' ? { type, url: '', method: 'POST' }
      : type === 'mailchimp' ? { type, apiKey: '', listId: '', emailField: 'email' }
      : type === 'redirect' ? { type, url: '/grazie' }
      : { type: 'db-only' };
    setActions([...actions, base]);
  }
  function updateAction(idx: number, patch: Record<string, unknown>) {
    setActions(actions.map((a, i) => i === idx ? { ...a, ...patch } as FormAction : a));
  }
  function removeAction(idx: number) {
    setActions(actions.filter((_, i) => i !== idx));
  }

  function setS<K extends keyof FormSettings>(k: K, v: FormSettings[K]) {
    setSettings({ ...settings, [k]: v });
  }

  const embedCode = `<!-- Inserisci questo widget in qualsiasi pagina -->\n<div data-en-form="${id}"></div>\n<script src="/_en-form-loader.js" defer></script>`;

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/forms"><ArrowLeft className="h-4 w-4" /> Form</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle><Input value={name} onChange={(e) => setName(e.target.value)} className="text-xl font-bold border-0 px-0 h-auto py-0 focus-visible:ring-0" /></CardTitle>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrizione interna..." rows={1} className="mt-1 border-0 px-0 resize-none focus-visible:ring-0" />
            </div>
            <Badge variant={status === 'ACTIVE' ? 'success' : 'outline'}>{status}</Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields">Campi ({fields.length})</TabsTrigger>
          <TabsTrigger value="actions">Azioni ({actions.length})</TabsTrigger>
          <TabsTrigger value="settings">Impostazioni</TabsTrigger>
          <TabsTrigger value="embed">Inserisci nel sito</TabsTrigger>
        </TabsList>

        {/* ===== FIELDS ===== */}
        <TabsContent value="fields" className="space-y-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Campi del form</CardTitle>
                <Button onClick={addField}><Plus className="h-4 w-4" /> Aggiungi campo</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.length === 0 && <p className="text-sm text-muted-foreground">Nessun campo.</p>}
              {fields.map((f, idx) => (
                <FieldEditor
                  key={f.id}
                  field={f}
                  onChange={(p) => updateField(idx, p)}
                  onRemove={() => removeField(idx)}
                  onDuplicate={() => duplicateField(idx)}
                  onUp={() => moveField(idx, 'up')}
                  onDown={() => moveField(idx, 'down')}
                  isFirst={idx === 0}
                  isLast={idx === fields.length - 1}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ACTIONS ===== */}
        <TabsContent value="actions" className="space-y-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Azioni alla submission</CardTitle>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => addAction('email')}>+ Email</Button>
                  <Button size="sm" variant="outline" onClick={() => addAction('autoresponder')}>+ Autoresponder</Button>
                  <Button size="sm" variant="outline" onClick={() => addAction('webhook')}>+ Webhook</Button>
                  <Button size="sm" variant="outline" onClick={() => addAction('mailchimp')}>+ Mailchimp</Button>
                  <Button size="sm" variant="outline" onClick={() => addAction('redirect')}>+ Redirect</Button>
                </div>
              </div>
              <CardDescription>Eseguite in ordine. Le submission sono sempre salvate nel DB.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {actions.length === 0 && <p className="text-sm text-muted-foreground">Solo salvataggio DB. Aggiungi un'azione per inviare email, webhook o iscrivere a Mailchimp.</p>}
              {actions.map((a, idx) => (
                <ActionEditor key={idx} action={a} onChange={(p) => updateAction(idx, p)} onRemove={() => removeAction(idx)} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SETTINGS ===== */}
        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>Impostazioni</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="space-y-2"><Label>Stato</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Attivo</SelectItem>
                    <SelectItem value="PAUSED">In pausa</SelectItem>
                    <SelectItem value="ARCHIVED">Archiviato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Testo bottone</Label><Input value={settings.submitText} onChange={(e) => setS('submitText', e.target.value)} /></div>
                <div className="space-y-2"><Label>Limite IP/24h (0 = no limit)</Label><Input type="number" value={settings.rateLimitPerIp} onChange={(e) => setS('rateLimitPerIp', Number(e.target.value))} /></div>
              </div>
              <div className="space-y-2"><Label>Messaggio successo</Label><Textarea rows={2} value={settings.successMessage} onChange={(e) => setS('successMessage', e.target.value)} /></div>
              <div className="space-y-2"><Label>Messaggio errore</Label><Textarea rows={2} value={settings.errorMessage} onChange={(e) => setS('errorMessage', e.target.value)} /></div>
              <div className="space-y-2"><Label>Redirect URL (opzionale)</Label><Input value={settings.redirectUrl ?? ''} onChange={(e) => setS('redirectUrl', e.target.value || undefined)} placeholder="/grazie" /></div>
              <div className="space-y-2"><Label>Testo consenso GDPR</Label><Textarea rows={2} value={settings.gdprText ?? ''} onChange={(e) => setS('gdprText', e.target.value || undefined)} placeholder="Acconsento al trattamento..." /></div>
              <div className="space-y-2"><Label>Anti-spam</Label>
                <Select value={settings.captcha} onValueChange={(v) => setS('captcha', v as FormSettings['captcha'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuno</SelectItem>
                    <SelectItem value="honeypot">Honeypot (campo nascosto)</SelectItem>
                    <SelectItem value="recaptcha-v3">reCAPTCHA v3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {settings.captcha === 'recaptcha-v3' && (
                <>
                  <div className="space-y-2"><Label>reCAPTCHA Site Key</Label><Input value={settings.recaptchaSiteKey ?? ''} onChange={(e) => setS('recaptchaSiteKey', e.target.value || undefined)} /></div>
                  <div className="space-y-2"><Label>reCAPTCHA Secret</Label><Input type="password" value={settings.recaptchaSecretKey ?? ''} onChange={(e) => setS('recaptchaSecretKey', e.target.value || undefined)} /></div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== EMBED ===== */}
        <TabsContent value="embed">
          <Card>
            <CardHeader>
              <CardTitle><Code2 className="h-5 w-5 inline mr-2" />Inserisci nel sito</CardTitle>
              <CardDescription>Usa il widget &quot;Form&quot; nell'editor visuale e seleziona questo form, oppure embeddalo via API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Form ID</Label>
                <code className="block p-3 bg-muted rounded-lg text-xs font-mono">{id}</code>
              </div>
              <div className="space-y-2">
                <Label>Endpoint submit</Label>
                <code className="block p-3 bg-muted rounded-lg text-xs font-mono">POST /api/forms/submit</code>
                <p className="text-xs text-muted-foreground">Body: <code>{`{ formId: "${id}", data: { ... }, honeypot: "" }`}</code></p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 -mx-8 -mb-8 px-8 py-3 bg-card border-t flex justify-end gap-3 z-20">
        <Button variant="outline" asChild>
          <Link href={`/admin/forms/${id}/submissions`}><Inbox /> {''} Submission</Link>
        </Button>
        <Button onClick={save} disabled={pending} size="lg">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salva
        </Button>
      </div>
    </div>
  );
}

import { Inbox } from 'lucide-react';

function FieldEditor({
  field, onChange, onRemove, onDuplicate, onUp, onDown, isFirst, isLast,
}: {
  field: FormField;
  onChange: (p: Partial<FormField>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUp: () => void;
  onDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const hasOptions = field.type === 'select' || field.type === 'radio' || field.type === 'checkbox-group';
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border rounded-lg bg-muted/20">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        <Badge variant="outline" className="text-[10px]">{FIELD_TYPE_LABELS[field.type] ?? field.type}</Badge>
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left font-medium text-sm">
          {field.label || field.name} {field.required && <span className="text-red-500">*</span>}
        </button>
        <Button variant="ghost" size="icon" onClick={onUp} disabled={isFirst} className="h-7 w-7"><ChevronUp className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" onClick={onDown} disabled={isLast} className="h-7 w-7"><ChevronDown className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" onClick={onDuplicate} className="h-7 w-7"><Copy className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" onClick={onRemove} className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
      </div>
      {expanded && (
        <div className="p-3 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={field.type} onValueChange={(v) => onChange({ type: v as FormField['type'] })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fieldTypes.map((t) => <SelectItem key={t} value={t}>{FIELD_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Etichetta</Label><Input value={field.label} onChange={(e) => onChange({ label: e.target.value })} className="h-8" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Nome (chiave)</Label><Input value={field.name} onChange={(e) => onChange({ name: e.target.value })} className="h-8 font-mono" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Placeholder</Label><Input value={field.placeholder ?? ''} onChange={(e) => onChange({ placeholder: e.target.value })} className="h-8" /></div>
          <div className="space-y-1.5 col-span-2"><Label className="text-xs">Help text</Label><Input value={field.helpText ?? ''} onChange={(e) => onChange({ helpText: e.target.value })} className="h-8" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Larghezza (1-12)</Label><Input type="number" value={field.width} onChange={(e) => onChange({ width: Math.max(1, Math.min(12, Number(e.target.value))) })} className="h-8" /></div>
          <div className="flex items-center justify-between p-2 border rounded col-span-1"><Label className="text-xs">Obbligatorio</Label><Switch checked={field.required} onCheckedChange={(v) => onChange({ required: v })} /></div>
          {hasOptions && (
            <div className="col-span-2 space-y-2">
              <Label className="text-xs">Opzioni (una per riga: valore|etichetta)</Label>
              <Textarea
                value={(field.options ?? []).map((o) => `${o.value}|${o.label}`).join('\n')}
                onChange={(e) => {
                  const opts = e.target.value.split('\n').filter(Boolean).map((line) => {
                    const [value, label] = line.split('|');
                    return { value: value?.trim() ?? '', label: (label?.trim() ?? value)?.trim() ?? '' };
                  });
                  onChange({ options: opts });
                }}
                rows={4}
                className="font-mono text-xs"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionEditor({ action, onChange, onRemove }: { action: FormAction; onChange: (p: Record<string, unknown>) => void; onRemove: () => void }) {
  const labels: Record<string, string> = {
    email: 'Email a destinatario',
    autoresponder: 'Autoresponder',
    webhook: 'Webhook',
    mailchimp: 'Mailchimp',
    redirect: 'Redirect',
    'db-only': 'Solo salva in DB',
  };
  return (
    <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{labels[action.type] ?? action.type}</Badge>
        <Button variant="ghost" size="icon" onClick={onRemove} className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
      </div>
      {action.type === 'email' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5 col-span-2"><Label className="text-xs">Destinatario</Label><Input value={action.to} onChange={(e) => onChange({ to: e.target.value })} placeholder="email@dominio.it" /></div>
          <div className="space-y-1.5"><Label className="text-xs">CC</Label><Input value={action.cc ?? ''} onChange={(e) => onChange({ cc: e.target.value || undefined })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Reply-To (campo)</Label><Input value={action.replyToField ?? ''} onChange={(e) => onChange({ replyToField: e.target.value || undefined })} placeholder="email" /></div>
          <div className="space-y-1.5 col-span-2"><Label className="text-xs">Oggetto</Label><Input value={action.subject ?? ''} onChange={(e) => onChange({ subject: e.target.value })} placeholder="Submission da {form}" /></div>
          <div className="space-y-1.5 col-span-2"><Label className="text-xs">Template (HTML, usa &#123;&#123;fieldName&#125;&#125;)</Label><Textarea rows={4} value={action.template ?? ''} onChange={(e) => onChange({ template: e.target.value || undefined })} className="font-mono text-xs" /></div>
        </div>
      )}
      {action.type === 'autoresponder' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label className="text-xs">Campo email destinatario</Label><Input value={action.toField} onChange={(e) => onChange({ toField: e.target.value })} placeholder="email" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Oggetto</Label><Input value={action.subject} onChange={(e) => onChange({ subject: e.target.value })} /></div>
          <div className="space-y-1.5 col-span-2"><Label className="text-xs">Corpo (testo)</Label><Textarea rows={5} value={action.body} onChange={(e) => onChange({ body: e.target.value })} /></div>
        </div>
      )}
      {action.type === 'webhook' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label className="text-xs">URL</Label><Input value={action.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://..." /></div>
          <div className="space-y-1.5"><Label className="text-xs">Metodo</Label>
            <Select value={action.method} onValueChange={(v) => onChange({ method: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="POST">POST</SelectItem><SelectItem value="PUT">PUT</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      )}
      {action.type === 'mailchimp' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5"><Label className="text-xs">API Key</Label><Input type="password" value={action.apiKey} onChange={(e) => onChange({ apiKey: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">List ID</Label><Input value={action.listId} onChange={(e) => onChange({ listId: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Campo email</Label><Input value={action.emailField} onChange={(e) => onChange({ emailField: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Campo nome (FNAME)</Label><Input value={action.nameField ?? ''} onChange={(e) => onChange({ nameField: e.target.value || undefined })} /></div>
        </div>
      )}
      {action.type === 'redirect' && (
        <div className="space-y-1.5"><Label className="text-xs">URL redirect</Label><Input value={action.url} onChange={(e) => onChange({ url: e.target.value })} /></div>
      )}
    </div>
  );
}
