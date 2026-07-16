'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Save, Loader2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { ConditionRule, Conditions } from '@/lib/theme-blocks';

const RULE_TYPES: { value: ConditionRule['type']; label: string }[] = [
  { value: 'all-site', label: 'Tutto il sito' },
  { value: 'homepage', label: 'Solo homepage' },
  { value: 'not-homepage', label: 'Esclude homepage' },
  { value: 'page-slug', label: 'Pagina specifica (slug)' },
  { value: 'url-prefix', label: 'URL inizia con' },
  { value: 'url-exact', label: 'URL esatto' },
  { value: 'url-regex', label: 'URL match regex' },
  { value: 'role', label: 'Ruolo utente' },
  { value: 'logged-in', label: 'Utente loggato' },
  { value: 'logged-out', label: 'Utente non loggato' },
  { value: 'device', label: 'Dispositivo' },
];

interface InitialState {
  name: string;
  priority: number;
  status: string;
  conditions: Conditions;
}

export function ThemeBlockSettingsForm({ id, initial }: { id: string; initial: InitialState }) {
  const [name, setName] = useState(initial.name);
  const [priority, setPriority] = useState(initial.priority);
  const [published, setPublished] = useState(initial.status === 'PUBLISHED');
  const [conditions, setConditions] = useState<Conditions>(initial.conditions);
  const [pending, start] = useTransition();
  const router = useRouter();

  function addRule(bucket: 'include' | 'exclude') {
    setConditions((c) => ({ ...c, [bucket]: [...c[bucket], { type: 'all-site' }] as ConditionRule[] }));
  }

  function updateRule(bucket: 'include' | 'exclude', idx: number, rule: ConditionRule) {
    setConditions((c) => ({ ...c, [bucket]: c[bucket].map((r, i) => (i === idx ? rule : r)) }));
  }

  function removeRule(bucket: 'include' | 'exclude', idx: number) {
    setConditions((c) => ({ ...c, [bucket]: c[bucket].filter((_, i) => i !== idx) }));
  }

  function save() {
    start(async () => {
      const res = await fetch(`/api/theme-blocks/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          priority,
          conditions,
          status: published ? 'PUBLISHED' : 'DRAFT',
        }),
      });
      if (!res.ok) {
        toast.error('Errore salvataggio');
        return;
      }
      toast.success('Impostazioni salvate');
      router.refresh();
    });
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/theme-builder"><ArrowLeft className="h-4 w-4" /> Theme Builder</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Generale</CardTitle>
          <CardDescription>Nome interno e priorità di applicazione</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 max-w-xl">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Priorità ({priority})</Label>
            <input
              type="range" min={0} max={100} step={1}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Più alta = applicato prima quando ci sono regole sovrapposte</p>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="font-medium">Pubblicato</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Solo i blocchi pubblicati appaiono sul sito</p>
            </div>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>

          <Button asChild variant="outline">
            <Link href={`/editor/theme-block/${id}`}><Edit3 className="h-4 w-4" /> Modifica contenuto nell'editor</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regole di applicazione</CardTitle>
          <CardDescription>
            Il blocco si applica se <b>almeno una</b> regola "Include" matcha e <b>nessuna</b> regola "Esclude" matcha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RuleGroup
            title="Include"
            tooltip="Dove DEVE apparire il blocco"
            color="emerald"
            rules={conditions.include}
            onAdd={() => addRule('include')}
            onUpdate={(idx, rule) => updateRule('include', idx, rule)}
            onRemove={(idx) => removeRule('include', idx)}
          />
          <RuleGroup
            title="Esclude"
            tooltip="Dove NON deve apparire (override include)"
            color="red"
            rules={conditions.exclude}
            onAdd={() => addRule('exclude')}
            onUpdate={(idx, rule) => updateRule('exclude', idx, rule)}
            onRemove={(idx) => removeRule('exclude', idx)}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-8 -mb-8 px-8 py-3 bg-card border-t flex items-center justify-end gap-3 z-20">
        <p className="text-xs text-muted-foreground mr-auto">Le modifiche vengono applicate al prossimo refresh delle pagine pubbliche.</p>
        <Button onClick={save} disabled={pending} size="lg">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salva
        </Button>
      </div>
    </>
  );
}

function RuleGroup({
  title, tooltip, color, rules, onAdd, onUpdate, onRemove,
}: {
  title: string;
  tooltip: string;
  color: 'emerald' | 'red';
  rules: ConditionRule[];
  onAdd: () => void;
  onUpdate: (idx: number, rule: ConditionRule) => void;
  onRemove: (idx: number) => void;
}) {
  const ringClass = color === 'emerald' ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50';
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{title} <span className="font-normal text-muted-foreground text-xs">— {tooltip}</span></h4>
        <Button variant="outline" size="sm" onClick={onAdd}><Plus className="h-3 w-3" /> Aggiungi</Button>
      </div>
      {rules.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nessuna regola</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <div key={idx} className={`flex items-center gap-2 p-3 border rounded-lg ${ringClass}`}>
              <RuleEditor rule={rule} onChange={(r) => onUpdate(idx, r)} />
              <Button variant="ghost" size="icon" onClick={() => onRemove(idx)} className="h-8 w-8 shrink-0">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RuleEditor({ rule, onChange }: { rule: ConditionRule; onChange: (r: ConditionRule) => void }) {
  function setType(type: ConditionRule['type']) {
    // Reset al default quando cambia tipo
    switch (type) {
      case 'page-slug': return onChange({ type, slug: '' });
      case 'url-prefix': return onChange({ type, prefix: '' });
      case 'url-exact': return onChange({ type, path: '' });
      case 'url-regex': return onChange({ type, pattern: '' });
      case 'role': return onChange({ type, role: 'ADMIN' });
      case 'device': return onChange({ type, device: 'desktop' });
      default: return onChange({ type } as ConditionRule);
    }
  }

  return (
    <div className="flex flex-1 gap-2 items-center">
      <Select value={rule.type} onValueChange={(v) => setType(v as ConditionRule['type'])}>
        <SelectTrigger className="w-[230px] shrink-0"><SelectValue /></SelectTrigger>
        <SelectContent>
          {RULE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {rule.type === 'page-slug' && <Input className="flex-1" placeholder="es. chi-siamo" value={rule.slug} onChange={(e) => onChange({ ...rule, slug: e.target.value })} />}
      {rule.type === 'url-prefix' && <Input className="flex-1" placeholder="es. /blog" value={rule.prefix} onChange={(e) => onChange({ ...rule, prefix: e.target.value })} />}
      {rule.type === 'url-exact' && <Input className="flex-1" placeholder="es. /landing-bf" value={rule.path} onChange={(e) => onChange({ ...rule, path: e.target.value })} />}
      {rule.type === 'url-regex' && <Input className="flex-1" placeholder="es. ^/products/.+$" value={rule.pattern} onChange={(e) => onChange({ ...rule, pattern: e.target.value })} />}
      {rule.type === 'role' && (
        <Select value={rule.role} onValueChange={(v) => onChange({ ...rule, role: v as 'ADMIN' | 'EDITOR' | 'VIEWER' | 'guest' })}>
          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="EDITOR">Editor</SelectItem>
            <SelectItem value="VIEWER">Viewer</SelectItem>
            <SelectItem value="guest">Ospite (non loggato)</SelectItem>
          </SelectContent>
        </Select>
      )}
      {rule.type === 'device' && (
        <Select value={rule.device} onValueChange={(v) => onChange({ ...rule, device: v as 'desktop' | 'tablet' | 'mobile' })}>
          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="tablet">Tablet</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
