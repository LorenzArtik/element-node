'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Trigger, PopupSettings } from '@/lib/popups';
import type { Conditions } from '@/lib/theme-blocks';

interface InitialState {
  name: string;
  priority: number;
  status: string;
  trigger: Trigger;
  conditions: Conditions;
  settings: PopupSettings;
}

export function PopupSettingsForm({ id, initial }: { id: string; initial: InitialState }) {
  const [name, setName] = useState(initial.name);
  const [priority, setPriority] = useState(initial.priority);
  const [published, setPublished] = useState(initial.status === 'PUBLISHED');
  const [trigger, setTrigger] = useState<Trigger>(initial.trigger);
  const [settings, setSettings] = useState<PopupSettings>(initial.settings);
  const [pending, start] = useTransition();
  const router = useRouter();

  function setTriggerType(type: Trigger['type']) {
    switch (type) {
      case 'page-load': return setTrigger({ type, delayMs: 1500 });
      case 'scroll-percent': return setTrigger({ type, percent: 50 });
      case 'exit-intent': return setTrigger({ type });
      case 'click-selector': return setTrigger({ type, selector: '#open-popup' });
      case 'inactivity': return setTrigger({ type, idleMs: 30_000 });
      case 'after-seconds': return setTrigger({ type, seconds: 15 });
    }
  }

  function save() {
    start(async () => {
      const res = await fetch(`/api/popups/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name, priority, trigger, settings,
          status: published ? 'PUBLISHED' : 'DRAFT',
        }),
      });
      if (!res.ok) {
        toast.error('Errore salvataggio');
        return;
      }
      toast.success('Salvato');
      router.refresh();
    });
  }

  function setS<K extends keyof PopupSettings>(k: K, v: PopupSettings[K]) {
    setSettings((s) => ({ ...s, [k]: v }));
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/popups"><ArrowLeft className="h-4 w-4" /> Popup</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Generale</CardTitle>
          <CardDescription>Nome, priorità, stato</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Priorità ({priority})</Label>
            <input type="range" min={0} max={100} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full" />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div><Label className="font-medium">Pubblicato</Label></div>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
          <Button asChild variant="outline"><Link href={`/editor/popup/${id}`}><Edit3 className="h-4 w-4" /> Apri editor contenuto</Link></Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="trigger">
        <TabsList>
          <TabsTrigger value="trigger">Trigger</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="behavior">Comportamento</TabsTrigger>
        </TabsList>

        <TabsContent value="trigger">
          <Card>
            <CardHeader>
              <CardTitle>Quando si apre</CardTitle>
              <CardDescription>Decidi l'evento che fa apparire il popup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={trigger.type} onValueChange={(v) => setTriggerType(v as Trigger['type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="page-load">Al caricamento della pagina</SelectItem>
                    <SelectItem value="after-seconds">Dopo N secondi</SelectItem>
                    <SelectItem value="scroll-percent">Allo scroll N%</SelectItem>
                    <SelectItem value="exit-intent">Exit intent (uscita pagina)</SelectItem>
                    <SelectItem value="click-selector">Click su selettore CSS</SelectItem>
                    <SelectItem value="inactivity">Inattività utente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {trigger.type === 'page-load' && (
                <div className="space-y-2"><Label>Ritardo (ms)</Label><Input type="number" value={trigger.delayMs} onChange={(e) => setTrigger({ ...trigger, delayMs: Number(e.target.value) })} /></div>
              )}
              {trigger.type === 'after-seconds' && (
                <div className="space-y-2"><Label>Secondi</Label><Input type="number" value={trigger.seconds} onChange={(e) => setTrigger({ ...trigger, seconds: Number(e.target.value) })} /></div>
              )}
              {trigger.type === 'scroll-percent' && (
                <div className="space-y-2"><Label>Percentuale ({trigger.percent}%)</Label><input type="range" min={1} max={100} value={trigger.percent} onChange={(e) => setTrigger({ ...trigger, percent: Number(e.target.value) })} className="w-full" /></div>
              )}
              {trigger.type === 'click-selector' && (
                <div className="space-y-2"><Label>Selettore CSS</Label><Input value={trigger.selector} onChange={(e) => setTrigger({ ...trigger, selector: e.target.value })} placeholder="es. #open-popup, .newsletter-btn" /></div>
              )}
              {trigger.type === 'inactivity' && (
                <div className="space-y-2"><Label>Tempo inattività (ms)</Label><Input type="number" value={trigger.idleMs} onChange={(e) => setTrigger({ ...trigger, idleMs: Number(e.target.value) })} /></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout">
          <Card>
            <CardHeader><CardTitle>Aspetto</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Larghezza</Label><Input value={settings.width} onChange={(e) => setS('width', e.target.value)} /></div>
                <div className="space-y-2"><Label>Larghezza max</Label><Input value={settings.maxWidth} onChange={(e) => setS('maxWidth', e.target.value)} /></div>
                <div className="space-y-2"><Label>Altezza</Label><Input value={settings.height} onChange={(e) => setS('height', e.target.value)} /></div>
                <div className="space-y-2"><Label>Altezza max</Label><Input value={settings.maxHeight} onChange={(e) => setS('maxHeight', e.target.value)} /></div>
                <div className="space-y-2"><Label>Border radius</Label><Input value={settings.borderRadius} onChange={(e) => setS('borderRadius', e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Posizione</Label>
                  <Select value={settings.position} onValueChange={(v) => setS('position', v as PopupSettings['position'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="top">Alto</SelectItem>
                      <SelectItem value="bottom">Basso</SelectItem>
                      <SelectItem value="top-left">Alto-sinistra</SelectItem>
                      <SelectItem value="top-right">Alto-destra</SelectItem>
                      <SelectItem value="bottom-left">Basso-sinistra</SelectItem>
                      <SelectItem value="bottom-right">Basso-destra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Animazione</Label>
                  <Select value={settings.animation} onValueChange={(v) => setS('animation', v as PopupSettings['animation'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="slide-up">Slide su</SelectItem>
                      <SelectItem value="slide-down">Slide giù</SelectItem>
                      <SelectItem value="none">Nessuna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Overlay color</Label><Input value={settings.overlayColor} onChange={(e) => setS('overlayColor', e.target.value)} /></div>
                <div className="space-y-2"><Label>Overlay blur</Label><Input value={settings.overlayBlur} onChange={(e) => setS('overlayBlur', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior">
          <Card>
            <CardHeader><CardTitle>Comportamento</CardTitle></CardHeader>
            <CardContent className="space-y-3 max-w-xl">
              <div className="flex items-center justify-between p-3 border rounded-lg"><Label>Pulsante chiudi (X)</Label><Switch checked={settings.dismissible} onCheckedChange={(v) => setS('dismissible', v)} /></div>
              <div className="flex items-center justify-between p-3 border rounded-lg"><Label>Chiudi con ESC</Label><Switch checked={settings.closeOnEscape} onCheckedChange={(v) => setS('closeOnEscape', v)} /></div>
              <div className="flex items-center justify-between p-3 border rounded-lg"><Label>Chiudi click overlay</Label><Switch checked={settings.closeOnOverlay} onCheckedChange={(v) => setS('closeOnOverlay', v)} /></div>
              <div className="space-y-2">
                <Label>Frequency cap (ms)</Label>
                <Input type="number" value={settings.frequencyMs} onChange={(e) => setS('frequencyMs', Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Dopo che l'utente chiude, non riapparire per questo tempo. Default 86400000 = 1 giorno. Metti 0 per riapparire ogni volta.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 -mx-8 -mb-8 px-8 py-3 bg-card border-t flex justify-end gap-3 z-20">
        <Button onClick={save} disabled={pending} size="lg">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salva
        </Button>
      </div>
    </>
  );
}
