'use client';

import { useEffect, useMemo, useState } from 'react';
import { useEditor } from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaField } from './MediaField';
import { Search, X, CheckCircle2, AlertTriangle, XCircle, Sparkles, Loader2, WandSparkles } from 'lucide-react';
import { analyzeSeo, type SeoAnalysis } from '@/lib/seo';

export interface SeoMeta {
  seoTitle: string;
  seoDesc: string;
  ogImage: string;
  noindex: boolean;
  canonical: string;
  focusKeyword: string;
}

export function SeoPanel({
  meta,
  onChange,
  baseUrl,
  slug,
  onClose,
}: {
  meta: SeoMeta;
  onChange: (m: SeoMeta) => void;
  baseUrl: string;
  slug: string;
  onClose: () => void;
}) {
  const title = useEditor((s) => s.pageTitle);
  const content = useEditor((s) => s.content);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiDone, setAiDone] = useState(false);

  async function optimizeWithAi() {
    setAiBusy(true);
    setAiError('');
    setAiDone(false);
    try {
      const res = await fetch('/api/ai/seo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, slug, content, focusKeyword: meta.focusKeyword || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      onChange({
        ...meta,
        seoTitle: j.seoTitle || meta.seoTitle,
        seoDesc: j.seoDesc || meta.seoDesc,
        focusKeyword: meta.focusKeyword || j.focusKeyword || '',
      });
      setAiDone(true);
      setTimeout(() => setAiDone(false), 4000);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setAiBusy(false);
    }
  }

  const analysis: SeoAnalysis = useMemo(() => analyzeSeo({
    title,
    seoTitle: meta.seoTitle,
    seoDesc: meta.seoDesc,
    slug,
    content,
    focusKeyword: meta.focusKeyword,
  }), [title, meta.seoTitle, meta.seoDesc, slug, content, meta.focusKeyword]);

  function set<K extends keyof SeoMeta>(k: K, v: SeoMeta[K]) {
    onChange({ ...meta, [k]: v });
  }

  const previewTitle = meta.seoTitle || title;
  const previewDesc = meta.seoDesc || '';

  return (
    <aside className="w-96 bg-card border-l flex flex-col shrink-0">
      <div className="h-12 border-b flex items-center justify-between px-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Search className="h-4 w-4" /> SEO
          <ScoreBadge score={analysis.score} />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Snippet preview Google */}
          <div className="border rounded-lg p-3 bg-muted/40 space-y-1">
            <div className="text-[11px] uppercase font-semibold text-muted-foreground">Anteprima Google</div>
            <div className="text-xs text-emerald-700 truncate">{baseUrl}/{slug || ''}</div>
            <div className="text-[#1a0dab] text-base font-medium leading-tight line-clamp-1">{previewTitle || 'Titolo della pagina'}</div>
            <div className="text-xs text-[#4d5156] leading-snug line-clamp-2">{previewDesc || 'Inserisci una description per mostrarla in anteprima.'}</div>
          </div>

          <Tabs defaultValue="meta">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="meta">Meta</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="adv">Avanzate</TabsTrigger>
            </TabsList>

            <TabsContent value="meta" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={aiBusy}
                  onClick={optimizeWithAi}
                >
                  {aiBusy ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analizzo la pagina…</>
                  ) : aiDone ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Fatto — rivedi e salva</>
                  ) : (
                    <><WandSparkles className="h-3.5 w-3.5 mr-1.5" /> Ottimizza con AI</>
                  )}
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  Genera title, description e keyword dal contenuto della pagina. Poi rivedi e salva.
                </p>
                {aiError && (
                  <div className="text-[11px] text-red-600 border border-red-200 bg-red-50 rounded-md px-2.5 py-1.5">
                    {aiError}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Focus keyword</Label>
                <Input value={meta.focusKeyword} onChange={(e) => set('focusKeyword', e.target.value)} placeholder="es. cms next.js" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">SEO Title <span className="text-muted-foreground">({meta.seoTitle.length}/65)</span></Label>
                <Input value={meta.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} placeholder={title} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meta description <span className="text-muted-foreground">({meta.seoDesc.length}/160)</span></Label>
                <Textarea rows={3} value={meta.seoDesc} onChange={(e) => set('seoDesc', e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">OG image (1200×630)</Label>
                <MediaField value={meta.ogImage} onChange={(v) => set('ogImage', v)} />
              </div>
            </TabsContent>

            <TabsContent value="adv" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Canonical URL</Label>
                <Input value={meta.canonical} onChange={(e) => set('canonical', e.target.value)} placeholder={`${baseUrl}/${slug}`} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-xs">Noindex</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Esclude la pagina dai motori di ricerca</p>
                </div>
                <Switch checked={meta.noindex} onCheckedChange={(v) => set('noindex', v)} />
              </div>
            </TabsContent>
          </Tabs>

          {/* Stats */}
          <div className="border rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
            <Stat label="Parole" value={analysis.stats.wordCount} />
            <Stat label="Heading" value={analysis.stats.headingsCount} />
            <Stat label="Immagini" value={analysis.stats.imagesCount} />
            <Stat label="Img senza alt" value={analysis.stats.imagesWithoutAlt} />
            <Stat label="Densità KW" value={`${analysis.stats.keywordDensity}%`} />
            <Stat label="Leggibilità" value={`${analysis.stats.fleschScore}/100`} />
          </div>

          {/* Checks */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 text-[11px] uppercase font-semibold text-muted-foreground bg-muted/40 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Analisi
            </div>
            <ul className="divide-y">
              {analysis.checks.map((c) => (
                <li key={c.id} className="px-3 py-2 flex items-start gap-2 text-xs">
                  {c.status === 'pass' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
                  {c.status === 'warn' && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                  {c.status === 'fail' && <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{c.label}</div>
                    {c.hint && <div className="text-muted-foreground text-[11px] mt-0.5">{c.hint}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <span className={`${color} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>{score}/100</span>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
