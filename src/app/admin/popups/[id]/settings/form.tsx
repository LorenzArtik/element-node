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
import { t } from '@/lib/admin-i18n';

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
        toast.error(t('Errore salvataggio', 'Save error'));
        return;
      }
      toast.success(t('Salvato', 'Saved'));
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
          <CardTitle>{t('Generale', 'General')}</CardTitle>
          <CardDescription>{t('Nome, priorità, stato', 'Name, priority, status')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="space-y-2"><Label>{t('Nome', 'Name')}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{t('Priorità', 'Priority')} ({priority})</Label>
            <input type="range" min={0} max={100} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full" />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div><Label className="font-medium">{t('Pubblicato', 'Published')}</Label></div>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
          <Button asChild variant="outline"><Link href={`/editor/popup/${id}`}><Edit3 className="h-4 w-4" /> {t('Apri editor contenuto', 'Open content editor')}</Link></Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="trigger">
        <TabsList>
          <TabsTrigger value="trigger">Trigger</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="behavior">{t('Comportamento', 'Behavior')}</TabsTrigger>
        </TabsList>

        <TabsContent value="trigger">
          <Card>
            <CardHeader>
              <CardTitle>{t('Quando si apre', 'When it opens')}</CardTitle>
              <CardDescription>{t("Decidi l'evento che fa apparire il popup", 'Choose the event that shows the popup')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label>{t('Tipo', 'Type')}</Label>
                <Select value={trigger.type} onValueChange={(v) => setTriggerType(v as Trigger['type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="page-load">{t('Al caricamento della pagina', 'On page load')}</SelectItem>
                    <SelectItem value="after-seconds">{t('Dopo N secondi', 'After N seconds')}</SelectItem>
                    <SelectItem value="scroll-percent">{t('Allo scroll N%', 'At N% scroll')}</SelectItem>
                    <SelectItem value="exit-intent">{t('Exit intent (uscita pagina)', 'Exit intent (leaving page)')}</SelectItem>
                    <SelectItem value="click-selector">{t('Click su selettore CSS', 'Click on CSS selector')}</SelectItem>
                    <SelectItem value="inactivity">{t('Inattività utente', 'User inactivity')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {trigger.type === 'page-load' && (
                <div className="space-y-2"><Label>{t('Ritardo (ms)', 'Delay (ms)')}</Label><Input type="number" value={trigger.delayMs} onChange={(e) => setTrigger({ ...trigger, delayMs: Number(e.target.value) })} /></div>
              )}
              {trigger.type === 'after-seconds' && (
                <div className="space-y-2"><Label>{t('Secondi', 'Seconds')}</Label><Input type="number" value={trigger.seconds} onChange={(e) => setTrigger({ ...trigger, seconds: Number(e.target.value) })} /></div>
              )}
              {trigger.type === 'scroll-percent' && (
                <div className="space-y-2"><Label>{t('Percentuale', 'Percentage')} ({trigger.percent}%)</Label><input type="range" min={1} max={100} value={trigger.percent} onChange={(e) => setTrigger({ ...trigger, percent: Number(e.target.value) })} className="w-full" /></div>
              )}
              {trigger.type === 'click-selector' && (
                <div className="space-y-2"><Label>{t('Selettore CSS', 'CSS selector')}</Label><Input value={trigger.selector} onChange={(e) => setTrigger({ ...trigger, selector: e.target.value })} placeholder={t('es. #open-popup, .newsletter-btn', 'e.g. #open-popup, .newsletter-btn')} /></div>
              )}
              {trigger.type === 'inactivity' && (
                <div className="space-y-2"><Label>{t('Tempo inattività (ms)', 'Idle time (ms)')}</Label><Input type="number" value={trigger.idleMs} onChange={(e) => setTrigger({ ...trigger, idleMs: Number(e.target.value) })} /></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout">
          <Card>
            <CardHeader><CardTitle>{t('Aspetto', 'Appearance')}</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>{t('Larghezza', 'Width')}</Label><Input value={settings.width} onChange={(e) => setS('width', e.target.value)} /></div>
                <div className="space-y-2"><Label>{t('Larghezza max', 'Max width')}</Label><Input value={settings.maxWidth} onChange={(e) => setS('maxWidth', e.target.value)} /></div>
                <div className="space-y-2"><Label>{t('Altezza', 'Height')}</Label><Input value={settings.height} onChange={(e) => setS('height', e.target.value)} /></div>
                <div className="space-y-2"><Label>{t('Altezza max', 'Max height')}</Label><Input value={settings.maxHeight} onChange={(e) => setS('maxHeight', e.target.value)} /></div>
                <div className="space-y-2"><Label>Border radius</Label><Input value={settings.borderRadius} onChange={(e) => setS('borderRadius', e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>{t('Posizione', 'Position')}</Label>
                  <Select value={settings.position} onValueChange={(v) => setS('position', v as PopupSettings['position'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="center">{t('Centro', 'Center')}</SelectItem>
                      <SelectItem value="top">{t('Alto', 'Top')}</SelectItem>
                      <SelectItem value="bottom">{t('Basso', 'Bottom')}</SelectItem>
                      <SelectItem value="top-left">{t('Alto-sinistra', 'Top-left')}</SelectItem>
                      <SelectItem value="top-right">{t('Alto-destra', 'Top-right')}</SelectItem>
                      <SelectItem value="bottom-left">{t('Basso-sinistra', 'Bottom-left')}</SelectItem>
                      <SelectItem value="bottom-right">{t('Basso-destra', 'Bottom-right')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t('Animazione', 'Animation')}</Label>
                  <Select value={settings.animation} onValueChange={(v) => setS('animation', v as PopupSettings['animation'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="slide-up">{t('Slide su', 'Slide up')}</SelectItem>
                      <SelectItem value="slide-down">{t('Slide giù', 'Slide down')}</SelectItem>
                      <SelectItem value="none">{t('Nessuna', 'None')}</SelectItem>
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
            <CardHeader><CardTitle>{t('Comportamento', 'Behavior')}</CardTitle></CardHeader>
            <CardContent className="space-y-3 max-w-xl">
              <div className="flex items-center justify-between p-3 border rounded-lg"><Label>{t('Pulsante chiudi (X)', 'Close button (X)')}</Label><Switch checked={settings.dismissible} onCheckedChange={(v) => setS('dismissible', v)} /></div>
              <div className="flex items-center justify-between p-3 border rounded-lg"><Label>{t('Chiudi con ESC', 'Close on ESC')}</Label><Switch checked={settings.closeOnEscape} onCheckedChange={(v) => setS('closeOnEscape', v)} /></div>
              <div className="flex items-center justify-between p-3 border rounded-lg"><Label>{t('Chiudi click overlay', 'Close on overlay click')}</Label><Switch checked={settings.closeOnOverlay} onCheckedChange={(v) => setS('closeOnOverlay', v)} /></div>
              <div className="space-y-2">
                <Label>Frequency cap (ms)</Label>
                <Input type="number" value={settings.frequencyMs} onChange={(e) => setS('frequencyMs', Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">{t("Dopo che l'utente chiude, non riapparire per questo tempo. Default 86400000 = 1 giorno. Metti 0 per riapparire ogni volta.", "After the user closes it, don't show it again for this time. Default 86400000 = 1 day. Set 0 to show it every time.")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 -mx-8 -mb-8 px-8 py-3 bg-card border-t flex justify-end gap-3 z-20">
        <Button onClick={save} disabled={pending} size="lg">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t('Salva', 'Save')}
        </Button>
      </div>
    </>
  );
}
