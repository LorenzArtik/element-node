'use client';

import { useEffect, useState } from 'react';
import { useEditor } from '@/lib/editor-store';
import type { ElementNode, WidgetField } from '@/lib/widgets-schema';
import { WIDGETS } from '@/lib/widgets-schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextField } from './RichTextField';
import { MediaField } from './MediaField';
import { DimensionsField, SliderWithUnit } from './DimensionsField';
import { BorderField, ShadowField, BackgroundField } from './StyleFields';
import { Settings, Layers, Trash2, Plus, Monitor, Tablet, Smartphone, ChevronDown, Copy, ClipboardPaste, RotateCcw } from 'lucide-react';
import { WIDGET_STYLE_SECTIONS, type StyleControlGroup } from '@/lib/widget-styles';
import { FontPicker } from '@/components/admin/FontPicker';

export function PropertyPanel() {
  return (
    <aside className="w-80 bg-card border-l flex flex-col shrink-0">
      <PropertyPanelContent />
    </aside>
  );
}

/** Content-only variant: renders inside any container (used by unified left panel). */
export function PropertyPanelContent() {
  const selected = useEditor((s) => s.selected);
  const content = useEditor((s) => s.content);

  if (!selected) return <EmptyContent />;

  if (selected.kind === 'section') {
    const section = content.sections.find((s) => s.id === selected.sectionId);
    if (!section) return <EmptyContent />;
    return <SectionPanel sectionId={section.id} settings={section.settings} />;
  }

  if (selected.kind === 'column') {
    const section = content.sections.find((s) => s.id === selected.sectionId);
    const column = section?.columns.find((c) => c.id === selected.columnId);
    if (!column) return <EmptyContent />;
    return <ColumnPanel sectionId={selected.sectionId} columnId={column.id} width={column.width} settings={column.settings} />;
  }

  if (selected.kind === 'element') {
    const section = content.sections.find((s) => s.id === selected.sectionId);
    const column = section?.columns.find((c) => c.id === selected.columnId);
    const element = column?.elements.find((e) => e.id === selected.elementId);
    if (!element) return <EmptyContent />;
    return (
      <ElementPanel
        sectionId={selected.sectionId}
        columnId={selected.columnId}
        element={element}
      />
    );
  }
  return <EmptyContent />;
}

/**
 * Componente riusabile per copy/paste/reset dello STILE (non del content).
 * Si attiva diversamente per element/column/section. "Incolla" abilitato solo se
 * il clipboard contiene uno stile dello stesso kind.
 */
function StyleClipboardActions(props: {
  target: { kind: 'element' | 'column' | 'section'; sectionId: string; columnId?: string; elementId?: string };
}) {
  const copyStyle = useEditor((s) => s.copyStyle);
  const pasteStyle = useEditor((s) => s.pasteStyle);
  const resetStyle = useEditor((s) => s.resetStyle);
  const clip = useEditor((s) => s.styleClipboard);
  const canPaste = !!clip && clip.kind === props.target.kind;
  const [hint, setHint] = useState<string | null>(null);
  const flash = (msg: string) => { setHint(msg); setTimeout(() => setHint(null), 1500); };
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/40">
      <Button
        variant="ghost" size="sm" className="h-7 px-2 text-xs"
        title="Copia stile (CMD+ALT+C)"
        onClick={() => { copyStyle(props.target); flash('Stile copiato'); }}
      >
        <Copy className="h-3.5 w-3.5 mr-1" /> Copia
      </Button>
      <Button
        variant="ghost" size="sm" className="h-7 px-2 text-xs"
        disabled={!canPaste}
        title={canPaste ? 'Incolla stile' : (clip ? `Clipboard di tipo "${clip.kind}", non compatibile` : 'Nessuno stile copiato')}
        onClick={() => { pasteStyle(props.target); flash('Stile incollato'); }}
      >
        <ClipboardPaste className="h-3.5 w-3.5 mr-1" /> Incolla
      </Button>
      <Button
        variant="ghost" size="sm" className="h-7 px-2 text-xs"
        title="Reset stile ai default"
        onClick={() => { if (confirm('Ripristinare lo stile ai default del widget? (Il content viene preservato)')) { resetStyle(props.target); flash('Stile resettato'); } }}
      >
        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
      </Button>
      {hint && <span className="ml-auto text-[11px] text-emerald-600 font-medium">{hint}</span>}
    </div>
  );
}

function EmptyContent() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-sm text-muted-foreground">
      <Layers className="h-10 w-10 mb-2 opacity-30" />
      Seleziona una sezione, una colonna o un widget per modificarlo.
    </div>
  );
}

function EmptyPanel() {
  return (
    <aside className="w-80 bg-card border-l flex flex-col shrink-0">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Settings className="h-4 w-4" /> Proprietà</h3>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-sm text-muted-foreground">
        <Layers className="h-10 w-10 mb-2 opacity-30" />
        Seleziona una sezione, una colonna o un widget per modificarlo.
      </div>
    </aside>
  );
}

function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-card">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">{children}</div>
      </ScrollArea>
    </div>
  );
}

type BgObj = {
  type?: 'none' | 'color' | 'image' | 'gradient';
  color?: string; image?: string; overlay?: string;
  gradient?: string; size?: string; position?: string; attachment?: string;
};

function SectionPanel({ sectionId, settings }: { sectionId: string; settings: Record<string, unknown> }) {
  const update = useEditor((s) => s.updateSectionSettings);
  const s = settings as {
    padding?: string; background?: string | BgObj; gap?: string; color?: string;
    boxShadow?: string; borderRadius?: string; minHeight?: string;
    paddingTop?: number | string; paddingBottom?: number | string;
    sticky?: boolean; anchor?: string; containerWidth?: string; fullWidth?: boolean;
  };
  // Normalizza background in object editing-friendly
  const bgIsObject = typeof s.background === 'object' && s.background !== null;
  const bg: BgObj = bgIsObject ? s.background as BgObj
    : typeof s.background === 'string' && s.background
      ? { type: s.background.startsWith('linear-') || s.background.startsWith('radial-') ? 'gradient' : 'color',
          ...(s.background.startsWith('linear-') || s.background.startsWith('radial-')
            ? { gradient: s.background } : { color: s.background }) }
      : { type: 'none' };

  function updateBg(patch: Partial<BgObj>) { update(sectionId, { background: { ...bg, ...patch } }); }

  return (
    <PanelShell title="Sezione">
      <StyleClipboardActions target={{ kind: 'section', sectionId }} />
      <Tabs defaultValue="layout">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="bg">Sfondo</TabsTrigger>
          <TabsTrigger value="adv">Avanzato</TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-4 pt-2">
          <Field label="Padding">
            <Input value={s.padding ?? ''} onChange={(e) => update(sectionId, { padding: e.target.value })} placeholder="60px 20px" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Padding top">
              <Input value={String(s.paddingTop ?? '')} onChange={(e) => update(sectionId, { paddingTop: e.target.value })} placeholder="es. 70" />
            </Field>
            <Field label="Padding bottom">
              <Input value={String(s.paddingBottom ?? '')} onChange={(e) => update(sectionId, { paddingBottom: e.target.value })} placeholder="es. 70" />
            </Field>
          </div>
          <Field label="Min height"><Input value={s.minHeight ?? ''} onChange={(e) => update(sectionId, { minHeight: e.target.value })} placeholder="es. 90vh" /></Field>
          <Field label="Container max-width"><Input value={s.containerWidth ?? ''} onChange={(e) => update(sectionId, { containerWidth: e.target.value })} placeholder="1170px" /></Field>
          <Field label="Gap colonne"><Input value={s.gap ?? '0'} onChange={(e) => update(sectionId, { gap: e.target.value })} placeholder="0 (default)" /></Field>
          <Field label="Border radius"><Input value={s.borderRadius ?? ''} onChange={(e) => update(sectionId, { borderRadius: e.target.value })} placeholder="es. 16px" /></Field>
          <Field label="Box shadow"><ShadowControl value={s.boxShadow ?? ''} onChange={(v) => update(sectionId, { boxShadow: v })} /></Field>
          <Field label="Colore testo"><ColorInput value={s.color ?? ''} onChange={(v) => update(sectionId, { color: v })} /></Field>
          <div className="flex items-center gap-2">
            <Switch checked={!!s.fullWidth} onCheckedChange={(v) => update(sectionId, { fullWidth: v })} />
            <Label className="text-sm">Full width</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!s.sticky} onCheckedChange={(v) => update(sectionId, { sticky: v })} />
            <Label className="text-sm">Sticky (top:0)</Label>
          </div>
          <Field label="Anchor (id HTML)"><Input value={s.anchor ?? ''} onChange={(e) => update(sectionId, { anchor: e.target.value })} placeholder="es. about" /></Field>
        </TabsContent>

        <TabsContent value="bg" className="space-y-4 pt-2">
          <Field label="Tipo sfondo">
            <Select value={bg.type ?? 'none'} onValueChange={(v) => update(sectionId, { background: { ...bg, type: v as BgObj['type'] } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuno</SelectItem>
                <SelectItem value="color">Colore</SelectItem>
                <SelectItem value="image">Immagine</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {(bg.type === 'color' || bg.type === 'image') && (
            <Field label="Colore di base"><ColorInput value={bg.color ?? ''} onChange={(v) => updateBg({ color: v })} /></Field>
          )}
          {bg.type === 'image' && (
            <>
              <Field label="Immagine">
                <MediaField value={bg.image ?? ''} onChange={(v) => updateBg({ image: v })} />
              </Field>
              <Field label="Overlay (CSS)">
                <Input value={bg.overlay ?? ''} onChange={(e) => updateBg({ overlay: e.target.value })} placeholder="linear-gradient(rgba(0,0,0,.5), rgba(0,0,0,.5))" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Size">
                  <Select value={bg.size ?? 'cover'} onValueChange={(v) => updateBg({ size: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">cover</SelectItem>
                      <SelectItem value="contain">contain</SelectItem>
                      <SelectItem value="auto">auto</SelectItem>
                      <SelectItem value="100% 100%">stretch</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Position">
                  <Select value={bg.position ?? 'center'} onValueChange={(v) => updateBg({ position: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['center','top','bottom','left','right','top left','top right','bottom left','bottom right'].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Attachment">
                <Select value={bg.attachment ?? 'scroll'} onValueChange={(v) => updateBg({ attachment: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scroll">scroll</SelectItem>
                    <SelectItem value="fixed">fixed (parallax)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          {bg.type === 'gradient' && (
            <Field label="Gradient CSS">
              <Textarea value={bg.gradient ?? ''} onChange={(e) => updateBg({ gradient: e.target.value })} placeholder="linear-gradient(135deg, #0f464d 0%, #1a6e75 100%)" rows={3} />
            </Field>
          )}
        </TabsContent>

        <TabsContent value="adv" className="space-y-4 pt-2">
          <Field label="Background CSS raw (override)">
            <Textarea value={typeof s.background === 'string' ? s.background : ''}
              onChange={(e) => update(sectionId, { background: e.target.value })}
              placeholder="Solo se vuoi una stringa CSS arbitraria — sovrascrive il tab Sfondo" rows={3} />
          </Field>
        </TabsContent>
      </Tabs>
    </PanelShell>
  );
}

function ColumnPanel({ sectionId, columnId, width, settings }: { sectionId: string; columnId: string; width: number; settings: Record<string, unknown> }) {
  const updateCol = useEditor((s) => s.updateColumn);
  const s = settings as { padding?: string; align?: string; background?: string };
  return (
    <PanelShell title="Colonna">
      <StyleClipboardActions target={{ kind: 'column', sectionId, columnId }} />
      <Field label={`Larghezza: ${width}%`}>
        <input
          type="range"
          min={5}
          max={100}
          value={width}
          onChange={(e) => updateCol(sectionId, columnId, { width: Number(e.target.value) })}
          className="w-full"
        />
      </Field>
      <Field label="Padding">
        <Input value={s.padding ?? '20px'} onChange={(e) => updateCol(sectionId, columnId, { settings: { ...settings, padding: e.target.value } })} />
      </Field>
      <Field label="Allineamento">
        <Select value={(s.align as string) ?? 'left'} onValueChange={(v) => updateCol(sectionId, columnId, { settings: { ...settings, align: v } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Sinistra</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">Destra</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Sfondo">
        <Input value={(s.background as string) ?? ''} onChange={(e) => updateCol(sectionId, columnId, { settings: { ...settings, background: e.target.value } })} />
      </Field>
      <Field label="Border radius">
        <Input value={(settings.borderRadius as string) ?? ''} onChange={(e) => updateCol(sectionId, columnId, { settings: { ...settings, borderRadius: e.target.value } })} placeholder="es. 16px" />
      </Field>
      <Field label="Box shadow">
        <ShadowControl value={(settings.boxShadow as string) ?? ''} onChange={(v) => updateCol(sectionId, columnId, { settings: { ...settings, boxShadow: v } })} />
      </Field>
      <Field label="Bordo">
        <Input value={(settings.border as string) ?? ''} onChange={(e) => updateCol(sectionId, columnId, { settings: { ...settings, border: e.target.value } })} placeholder="es. 1px solid #e6f4ff" />
      </Field>
      <Field label="Overflow">
        <Select value={(settings.overflow as string) || 'visible'} onValueChange={(v) => updateCol(sectionId, columnId, { settings: { ...settings, overflow: v === 'visible' ? '' : v } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="visible">Visibile</SelectItem>
            <SelectItem value="hidden">Nascosto (card con media)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Disposizione elementi">
        <Select value={(settings.elementsDirection as string) || 'column'} onValueChange={(v) => updateCol(sectionId, columnId, { settings: { ...settings, elementsDirection: v } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="column">In colonna (default)</SelectItem>
            <SelectItem value="row">In riga (bottoni/loghi affiancati)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {(settings.elementsDirection as string) === 'row' && (
        <>
          <Field label="Giustificazione riga">
            <Select value={(settings.elementsJustify as string) || 'center'} onValueChange={(v) => updateCol(sectionId, columnId, { settings: { ...settings, elementsJustify: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flex-start">Inizio</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="flex-end">Fine</SelectItem>
                <SelectItem value="space-between">Spazio tra</SelectItem>
                <SelectItem value="space-around">Spazio attorno</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Gap riga (px)">
            <Input value={String(settings.elementsGap ?? '16')} onChange={(e) => updateCol(sectionId, columnId, { settings: { ...settings, elementsGap: e.target.value } })} placeholder="16" />
          </Field>
        </>
      )}
    </PanelShell>
  );
}

function ElementPanel({ sectionId, columnId, element }: { sectionId: string; columnId: string; element: ElementNode }) {
  const update = useEditor((s) => s.updateElementSettings);
  const device = useEditor((s) => s.device);
  const desc = WIDGETS[element.type];

  function set(key: string, value: unknown) {
    update(sectionId, columnId, element.id, { [key]: value });
  }

  function setStyle(key: string, value: unknown) {
    const style = (element.settings._style as Record<string, unknown>) ?? {};
    update(sectionId, columnId, element.id, { _style: { ...style, [key]: value } });
  }
  const styleObj = (element.settings._style as Record<string, unknown>) ?? {};

  return (
    <PanelShell title={desc.label}>
      <StyleClipboardActions target={{ kind: 'element', sectionId, columnId, elementId: element.id }} />
      <DeviceIndicator device={device} />
      <Tabs defaultValue="content">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="content">Contenuto</TabsTrigger>
          <TabsTrigger value="style">Stile</TabsTrigger>
          <TabsTrigger value="advanced">Avanzato</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4 pt-2">
          {desc.fields.map((field) => (
            <RenderField
              key={field.key}
              field={field}
              value={(element.settings as Record<string, unknown>)[field.key]}
              onChange={(v) => set(field.key, v)}
            />
          ))}
          {element.type === 'box' && (
            <BoxChildrenEditor
              childrenEls={((element.settings.children as ElementNode[]) ?? [])}
              onChange={(next) => set('children', next)}
            />
          )}
        </TabsContent>

        <TabsContent value="style" className="space-y-4 pt-2">
          {WIDGET_STYLE_SECTIONS[element.type] ? (
            <SubElementStylePanels
              sections={WIDGET_STYLE_SECTIONS[element.type]!}
              styles={(element.settings._styles as Record<string, Record<string, unknown>>) ?? {}}
              onChange={(key, patch) => {
                const all = (element.settings._styles as Record<string, Record<string, unknown>>) ?? {};
                update(sectionId, columnId, element.id, {
                  _styles: { ...all, [key]: { ...(all[key] ?? {}), ...patch } },
                });
              }}
            />
          ) : (
            <p className="text-xs text-muted-foreground">Questo widget non espone controlli di stile per sotto-elementi. Usa Avanzato per CSS custom.</p>
          )}
          <div className="border-t pt-4 mt-4">
            <details>
              <summary className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 cursor-pointer hover:text-foreground select-none">Wrapper widget (avanzato)</summary>
              <div className="space-y-3 mt-3">
                <Field label="Margin">
                  <DimensionsField value={(styleObj.margin as string) ?? ''} onChange={(v) => setStyle('margin', v)} />
                </Field>
                <Field label="Padding">
                  <DimensionsField value={(styleObj.padding as string) ?? ''} onChange={(v) => setStyle('padding', v)} />
                </Field>
                <Field label="Background"><ColorInput value={(styleObj.background as string) ?? ''} onChange={(v) => setStyle('background', v)} /></Field>
                <Field label="Border radius"><DimensionsField value={(styleObj.borderRadius as string) ?? ''} onChange={(v) => setStyle('borderRadius', v)} labels={['TL','TR','BR','BL']} /></Field>
              </div>
            </details>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Bordo</h4>
            <Field label="Border (CSS)"><Input value={(styleObj.border as string) ?? ''} onChange={(e) => setStyle('border', e.target.value)} placeholder="1px solid #ddd" /></Field>
            <div className="mt-3">
              <Field label="Box shadow"><ShadowControl value={(styleObj.boxShadow as string) ?? ''} onChange={(v) => setStyle('boxShadow', v)} /></Field>
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Effetti</h4>
            <Field label={`Opacity: ${styleObj.opacity ?? '1'}`}>
              <input
                type="range" min={0} max={1} step={0.05}
                value={typeof styleObj.opacity === 'string' ? parseFloat(styleObj.opacity) || 1 : 1}
                onChange={(e) => setStyle('opacity', e.target.value)}
                className="w-full"
              />
            </Field>
            <div className="mt-3">
              <Field label="Transform">
                <Input value={(styleObj.transform as string) ?? ''} onChange={(e) => setStyle('transform', e.target.value)} placeholder="rotate(0deg) scale(1)" />
              </Field>
            </div>
          </div>

          {/* Visibilità responsive */}
          <div className="pt-3 border-t">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Visibilità responsive</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {([
                { key: 'desktop', label: 'Desktop', Icon: Monitor },
                { key: 'tablet', label: 'Tablet', Icon: Tablet },
                { key: 'mobile', label: 'Mobile', Icon: Smartphone },
              ] as const).map(({ key, label, Icon }) => {
                const hidden = ((element.settings._hideOn as string[]) ?? []).includes(key);
                return (
                  <label key={key} className={`flex flex-col items-center justify-center gap-1 p-2 border rounded cursor-pointer transition-colors ${
                    hidden ? 'bg-destructive/10 text-destructive border-destructive/30' : 'hover:bg-accent'
                  }`}>
                    <input
                      type="checkbox"
                      checked={!hidden}
                      onChange={(e) => {
                        const cur = ((element.settings._hideOn as string[]) ?? []);
                        const next = e.target.checked ? cur.filter((x) => x !== key) : [...cur, key];
                        set('_hideOn', next);
                      }}
                      className="hidden"
                    />
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Nascondi questo widget su device specifici</p>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 pt-2 text-sm text-muted-foreground">
          <Field label="ID elemento"><Input value={element.id} readOnly className="font-mono text-xs" /></Field>
          <Field label="CSS classes">
            <Input
              value={(element.settings._classes as string) ?? ''}
              onChange={(e) => set('_classes', e.target.value)}
              placeholder="custom-class another-class"
            />
          </Field>
          <Field label="HTML id (anchor)">
            <Input
              value={(element.settings._htmlId as string) ?? ''}
              onChange={(e) => set('_htmlId', e.target.value)}
              placeholder="my-anchor"
            />
          </Field>
          <Field label="CSS personalizzato">
            <Textarea
              value={(element.settings._css as string) ?? ''}
              onChange={(e) => set('_css', e.target.value)}
              rows={6}
              className="font-mono text-xs"
              placeholder="selector { color: red; }"
            />
          </Field>
        </TabsContent>
      </Tabs>
    </PanelShell>
  );
}

function DeviceIndicator({ device }: { device: string }) {
  const map: Record<string, { label: string; Icon: typeof Monitor; w: string }> = {
    desktop: { label: 'Desktop', Icon: Monitor, w: '100%' },
    tablet: { label: 'Tablet', Icon: Tablet, w: '768px' },
    mobile: { label: 'Mobile', Icon: Smartphone, w: '375px' },
  };
  const d = map[device] ?? map.desktop;
  const Icon = d.Icon;
  return (
    <div className="px-3 py-1.5 bg-muted rounded-md text-[10px] text-muted-foreground flex items-center justify-between">
      <span>Vista {d.label} · {d.w}</span>
      <Icon className="h-3.5 w-3.5" />
    </div>
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

function FormPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [forms, setForms] = useState<{ id: string; name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/forms').then(r => r.ok ? r.json() : []).then((data) => {
      setForms(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-muted-foreground">Caricamento...</div>;
  if (forms.length === 0) {
    return (
      <div className="text-xs text-muted-foreground border rounded p-2">
        Nessun form salvato. <a href="/admin/forms" className="text-primary underline" target="_blank" rel="noreferrer">Crea un form</a> per usarlo qui.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Seleziona un form..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value=" ">— Nessuno (usa fields inline) —</SelectItem>
          {forms.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.name} {f.status !== 'ACTIVE' && `(${f.status})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && value.trim() && (
        <a href={`/admin/forms/${value}`} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline">
          Modifica form
        </a>
      )}
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 h-9 rounded border cursor-pointer"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000000" className="flex-1" />
    </div>
  );
}

const BOX_CHILD_TYPES: { value: string; label: string }[] = [
  { value: 'heading', label: 'Titolo' },
  { value: 'text', label: 'Testo' },
  { value: 'button', label: 'Pulsante' },
  { value: 'image', label: 'Immagine' },
  { value: 'icon', label: 'Icona' },
  { value: 'icon-box', label: 'Box Icona' },
  { value: 'icon-list', label: 'Lista Icone' },
  { value: 'counter', label: 'Contatore' },
  { value: 'divider', label: 'Divisore' },
  { value: 'spacer', label: 'Spazio' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'social-icons', label: 'Social Icons' },
  { value: 'box', label: 'Box annidato' },
  { value: 'html', label: 'HTML' },
];

function BoxChildrenEditor({ childrenEls, onChange }: { childrenEls: ElementNode[]; onChange: (next: ElementNode[]) => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [newType, setNewType] = useState<string>('text');

  const setChild = (i: number, patch: Record<string, unknown>) => {
    const next = childrenEls.map((c, j) => (j === i ? { ...c, settings: { ...c.settings, ...patch } } : c));
    onChange(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= childrenEls.length) return;
    const next = [...childrenEls];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpenIdx(j);
  };
  const remove = (i: number) => {
    onChange(childrenEls.filter((_, j) => j !== i));
    setOpenIdx(null);
  };
  const add = () => {
    const desc = WIDGETS[newType as keyof typeof WIDGETS];
    if (!desc) return;
    const el: ElementNode = {
      id: `el_${Math.random().toString(36).slice(2, 10)}`,
      type: newType as ElementNode['type'],
      settings: JSON.parse(JSON.stringify(desc.defaults ?? {})),
    };
    onChange([...childrenEls, el]);
    setOpenIdx(childrenEls.length);
  };

  return (
    <div className="border-t pt-3 mt-3 space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Elementi nel box ({childrenEls.length})</Label>
      {childrenEls.map((child, i) => {
        const cdesc = WIDGETS[child.type];
        const isOpen = openIdx === i;
        const preview = (child.settings.text as string) || (child.settings.title as string) || (child.settings.html as string)?.replace(/<[^>]+>/g, '').slice(0, 30) || '';
        return (
          <div key={child.id} className="rounded-md border">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button type="button" className="flex-1 text-left text-sm font-medium truncate" onClick={() => setOpenIdx(isOpen ? null : i)}>
                {cdesc?.label ?? child.type}
                {preview ? <span className="text-muted-foreground font-normal"> — {preview.slice(0, 26)}</span> : null}
              </button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(i, -1)} disabled={i === 0} title="Su">↑</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(i, 1)} disabled={i === childrenEls.length - 1} title="Giù">↓</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => remove(i)} title="Rimuovi"><Trash2 className="h-3.5 w-3.5" /></Button>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && cdesc && (
              <div className="border-t px-2 py-2 space-y-3">
                {cdesc.fields.map((field) => (
                  <RenderField
                    key={field.key}
                    field={field}
                    value={(child.settings as Record<string, unknown>)[field.key]}
                    onChange={(v) => setChild(i, { [field.key]: v })}
                  />
                ))}
                {child.type === 'box' && (
                  <BoxChildrenEditor
                    childrenEls={((child.settings.children as ElementNode[]) ?? [])}
                    onChange={(next) => setChild(i, { children: next })}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-2 pt-1">
        <Select value={newType} onValueChange={setNewType}>
          <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {BOX_CHILD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" />Aggiungi</Button>
      </div>
    </div>
  );
}

function RenderField({
  field,
  value,
  onChange,
}: {
  field: WidgetField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.control) {
    case 'text':
    case 'url':
      return (
        <Field label={field.label}>
          <Input value={(value as string) ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
    case 'textarea':
      return (
        <Field label={field.label}>
          <Textarea value={(value as string) ?? ''} rows={4} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
    case 'richtext':
      return (
        <Field label={field.label}>
          <RichTextField value={(value as string) ?? ''} onChange={onChange} />
        </Field>
      );
    case 'number':
      return (
        <Field label={field.label}>
          <Input type="number" value={(value as number) ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
        </Field>
      );
    case 'select':
      return (
        <Field label={field.label}>
          <Select value={(value as string) ?? ''} onValueChange={onChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {field.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      );
    case 'color':
      return (
        <Field label={field.label}>
          <ColorInput value={(value as string) ?? ''} onChange={onChange} />
        </Field>
      );
    case 'switch':
      return (
        <div className="flex items-center justify-between p-2 rounded border">
          <Label className="text-xs">{field.label}</Label>
          <Switch checked={Boolean(value)} onCheckedChange={onChange} />
        </div>
      );
    case 'media':
      return (
        <Field label={field.label}>
          <MediaField value={(value as string) ?? ''} onChange={onChange} />
        </Field>
      );
    case 'icon':
      return (
        <Field label={field.label}>
          <Input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="es. Star, Heart, Zap" />
          <p className="text-[10px] text-muted-foreground mt-1">Nomi icone da lucide.dev</p>
        </Field>
      );
    case 'slider':
      return (
        <Field label={`${field.label}: ${value ?? 0}${field.unit ?? ''}`}>
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={(value as number) ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full"
          />
        </Field>
      );
    case 'dimension': {
      // String value tipo "120px", "50%", "auto" - usa SliderWithUnit (slider + numeric + unit selector)
      const stringValue = typeof value === 'string' ? value : '';
      const isAuto = !stringValue || stringValue === 'auto';
      return (
        <Field label={field.label} help={field.help}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(isAuto ? '100%' : 'auto')}
              className={`text-[10px] px-2 py-1 rounded border h-7 ${isAuto ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-card hover:bg-muted'}`}
              title={isAuto ? 'Disattiva auto (usa slider)' : 'Imposta a auto'}
            >
              auto
            </button>
            {!isAuto && (
              <div className="flex-1">
                <SliderWithUnit
                  value={stringValue}
                  onChange={onChange}
                  min={field.min ?? 0}
                  max={field.max ?? 1200}
                  step={field.step ?? 1}
                  units={['px', '%', 'em', 'rem', 'vw', 'vh']}
                />
              </div>
            )}
            {isAuto && <span className="text-xs text-muted-foreground flex-1">Dimensione automatica</span>}
          </div>
        </Field>
      );
    }
    case 'spacing':
      return (
        <Field label={field.label}>
          <DimensionsField
            value={(value as string) ?? ''}
            onChange={onChange}
            labels={field.key.toLowerCase().includes('radius') ? ['TL', 'TR', 'BR', 'BL'] : undefined}
          />
        </Field>
      );
    case 'border-style':
      return (
        <Field label={field.label}>
          <BorderField value={(value as string) ?? ''} onChange={(v) => onChange(v)} />
        </Field>
      );
    case 'shadow-style':
      return (
        <Field label={field.label}>
          <ShadowField value={(value as string) ?? ''} onChange={(v) => onChange(v)} />
        </Field>
      );
    case 'background-style':
      return (
        <Field label={field.label}>
          <BackgroundField value={(value as string) ?? ''} onChange={(v) => onChange(v)} />
        </Field>
      );
    case 'form-picker':
      return (
        <Field label={field.label} help={field.help}>
          <FormPicker value={(value as string) ?? ''} onChange={onChange} />
        </Field>
      );
    case 'list':
      return (
        <Field label={field.label}>
          <ListField field={field} value={(value as Record<string, unknown>[]) ?? []} onChange={onChange} />
        </Field>
      );
    default:
      return null;
  }
}

function ListField({ field, value, onChange }: { field: WidgetField; value: Record<string, unknown>[]; onChange: (v: Record<string, unknown>[]) => void }) {
  function update(idx: number, key: string, v: unknown) {
    const next = [...value];
    next[idx] = { ...next[idx], [key]: v };
    onChange(next);
  }
  function add() {
    const item: Record<string, unknown> = {};
    (field.itemTemplate ?? []).forEach((f) => (item[f.key] = ''));
    onChange([...value, item]);
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      {value.map((item, idx) => (
        <div key={idx} className="border rounded-lg p-2 space-y-2 bg-muted/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">#{idx + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(idx)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
          {(field.itemTemplate ?? []).map((sub) => (
            <RenderField
              key={sub.key}
              field={sub}
              value={item[sub.key]}
              onChange={(v) => update(idx, sub.key, v)}
            />
          ))}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="h-3 w-3" /> Aggiungi voce
      </Button>
    </div>
  );
}

// ─── Sub-element style controls (pattern Elementor) ─────────────────────────
function SubElementStylePanels({
  sections, styles, onChange,
}: {
  sections: { key: string; label: string; controls: StyleControlGroup[] }[];
  styles: Record<string, Record<string, unknown>>;
  onChange: (key: string, patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-2">
      {sections.map((sec) => (
        <SubStyleAccordion
          key={sec.key}
          label={sec.label}
          controls={sec.controls}
          value={styles[sec.key] ?? {}}
          onChange={(patch) => onChange(sec.key, patch)}
        />
      ))}
    </div>
  );
}

function SubStyleAccordion({
  label, controls, value, onChange,
}: {
  label: string;
  controls: StyleControlGroup[];
  value: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-md overflow-hidden bg-card">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-accent transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="p-3 space-y-3 border-t border-border">
          {controls.includes('typography') && (
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipografia</h5>
              <Field label="Font family">
                <FontPicker
                  value={(value.fontFamily as string) ?? ''}
                  onChange={(v) => onChange({ fontFamily: v })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Size">
                  <Input value={(value.fontSize as string) ?? ''} onChange={(e) => onChange({ fontSize: e.target.value })} placeholder="2.25rem" />
                </Field>
                <Field label="Weight">
                  <Select value={(value.fontWeight as string) ?? ''} onValueChange={(v) => onChange({ fontWeight: v })}>
                    <SelectTrigger><SelectValue placeholder="default" /></SelectTrigger>
                    <SelectContent>
                      {['300','400','500','600','700','800','900'].map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Line height">
                  <Input value={(value.lineHeight as string) ?? ''} onChange={(e) => onChange({ lineHeight: e.target.value })} placeholder="1.6" />
                </Field>
                <Field label="Letter spacing">
                  <Input value={(value.letterSpacing as string) ?? ''} onChange={(e) => onChange({ letterSpacing: e.target.value })} placeholder="0.02em" />
                </Field>
              </div>
              <Field label="Transform">
                <Select value={(value.textTransform as string) ?? ''} onValueChange={(v) => onChange({ textTransform: v })}>
                  <SelectTrigger><SelectValue placeholder="default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">none</SelectItem>
                    <SelectItem value="uppercase">UPPERCASE</SelectItem>
                    <SelectItem value="lowercase">lowercase</SelectItem>
                    <SelectItem value="capitalize">Capitalize</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
          {controls.includes('color') && (
            <Field label="Colore"><ColorInput value={(value.color as string) ?? ''} onChange={(v) => onChange({ color: v })} /></Field>
          )}
          {controls.includes('background') && (
            <Field label="Background"><ColorInput value={(value.background as string) ?? ''} onChange={(v) => onChange({ background: v })} /></Field>
          )}
          {controls.includes('spacing') && (
            <>
              <Field label="Margin"><DimensionsField value={(value.margin as string) ?? ''} onChange={(v) => onChange({ margin: v })} /></Field>
              <Field label="Padding"><DimensionsField value={(value.padding as string) ?? ''} onChange={(v) => onChange({ padding: v })} /></Field>
            </>
          )}
          {controls.includes('border') && (
            <>
              <Field label="Border (CSS)">
                <Input value={(value.border as string) ?? ''} onChange={(e) => onChange({ border: e.target.value })} placeholder="1px solid #ddd" />
              </Field>
              <Field label="Border radius">
                <DimensionsField value={(value.borderRadius as string) ?? ''} onChange={(v) => onChange({ borderRadius: v })} labels={['TL','TR','BR','BL']} />
              </Field>
            </>
          )}
          {controls.includes('shadow') && (
            <Field label="Box shadow">
              <ShadowControl value={(value.boxShadow as string) ?? ''} onChange={(v) => onChange({ boxShadow: v })} />
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ShadowControl: editor visuale per box-shadow ───────────────────────────
interface ShadowParts { inset: boolean; x: number; y: number; blur: number; spread: number; color: string }

function parseShadow(s: string): ShadowParts {
  const def: ShadowParts = { inset: false, x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(0,0,0,0.15)' };
  if (!s || s === 'none') return def;
  const inset = /\binset\b/i.test(s);
  const cleaned = s.replace(/\binset\b/i, '').trim();
  // Estrai colore (rgba/rgb/hex/named)
  const colorMatch = cleaned.match(/(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-f]{3,8}|\b[a-z]+\b)\s*$/i);
  const color = colorMatch?.[0] ?? def.color;
  const nums = cleaned.replace(color, '').trim().split(/\s+/).map((p) => parseFloat(p) || 0);
  return { inset, x: nums[0] ?? 0, y: nums[1] ?? 4, blur: nums[2] ?? 12, spread: nums[3] ?? 0, color };
}

function serializeShadow(p: ShadowParts): string {
  if (!p.x && !p.y && !p.blur && !p.spread && (!p.color || p.color === 'transparent')) return '';
  return `${p.inset ? 'inset ' : ''}${p.x}px ${p.y}px ${p.blur}px ${p.spread}px ${p.color}`;
}

const SHADOW_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Nessuna', value: '' },
  { label: 'XS', value: '0 1px 2px rgba(0,0,0,.06)' },
  { label: 'SM', value: '0 2px 8px rgba(0,0,0,.08)' },
  { label: 'MD', value: '0 4px 16px rgba(0,0,0,.10)' },
  { label: 'LG', value: '0 8px 24px rgba(0,0,0,.12)' },
  { label: 'XL', value: '0 16px 40px rgba(0,0,0,.18)' },
];

function ShadowControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = parseShadow(value);
  const set = (patch: Partial<ShadowParts>) => onChange(serializeShadow({ ...parts, ...patch }));

  // Estrai hex se possibile per color picker
  const colorIsHex = /^#[0-9a-f]{3,8}$/i.test(parts.color);
  return (
    <div className="space-y-2 border rounded-md p-2.5 bg-muted/30">
      <div className="flex flex-wrap gap-1">
        {SHADOW_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onChange(p.value)}
            className={`px-2 py-1 text-[10px] font-semibold rounded border transition-colors ${
              value === p.value ? 'bg-[#92003b] text-white border-[#92003b]' : 'bg-card hover:bg-accent'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {value && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <ShadowSlider label="X" value={parts.x} min={-50} max={50} onChange={(v) => set({ x: v })} />
            <ShadowSlider label="Y" value={parts.y} min={-50} max={50} onChange={(v) => set({ y: v })} />
            <ShadowSlider label="Blur" value={parts.blur} min={0} max={100} onChange={(v) => set({ blur: v })} />
            <ShadowSlider label="Spread" value={parts.spread} min={-50} max={50} onChange={(v) => set({ spread: v })} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground w-12">Color</label>
            <input
              type="color"
              value={colorIsHex ? parts.color : '#000000'}
              onChange={(e) => set({ color: e.target.value })}
              className="h-7 w-10 rounded border cursor-pointer"
            />
            <Input
              value={parts.color}
              onChange={(e) => set({ color: e.target.value })}
              className="flex-1 h-7 text-xs font-mono"
              placeholder="rgba(0,0,0,.15)"
            />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={parts.inset}
              onChange={(e) => set({ inset: e.target.checked })}
            />
            <span>Inset (ombra interna)</span>
          </label>
          <div className="flex items-center justify-center bg-card rounded-md py-4 mt-1">
            <div
              className="w-20 h-12 rounded-md bg-card border"
              style={{ boxShadow: serializeShadow(parts), background: '#fff' }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ShadowSlider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
        <span className="text-[10px] font-mono">{value}px</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5"
      />
    </div>
  );
}
