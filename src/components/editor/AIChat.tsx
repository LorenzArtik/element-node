'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useEditor } from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X, Send, Loader2, Wand2, Image as ImageIcon, Paperclip } from 'lucide-react';
import type { SectionNode, ElementNode, PageContent } from '@/lib/widgets-schema';

type Message = { role: 'user' | 'assistant'; text: string; ts: number; images?: string[] };

const QUICK_PROMPTS = [
  'Crea una sezione hero con titolo, sottotitolo e bottone CTA',
  'Aggiungi una sezione "Servizi" con 3 box icona',
  'Genera una sezione testimonianze con 3 recensioni',
  'Crea un FAQ con 5 domande comuni',
  'Aggiungi un contact form completo',
  'Genera una pricing table con 3 piani',
];

interface RefImage {
  base64: string; // data URL
  mediaType: string;
  preview: string;
}

export function AIChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Ciao, dimmi cosa vuoi creare o modificare.',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [refImages, setRefImages] = useState<RefImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selected = useEditor((s) => s.selected);
  const select = useEditor((s) => s.select);
  const content = useEditor((s) => s.content);
  const pageTitle = useEditor((s) => s.pageTitle);
  const appendSection = useEditor((s) => s.appendSection);
  const replaceSection = useEditor((s) => s.replaceSection);
  const replaceContent = useEditor((s) => s.replaceContent);
  const updateElement = useEditor((s) => s.updateElementSettings);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    for (const f of list.slice(0, 5 - refImages.length)) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: troppo grande (max 5MB)`);
        continue;
      }
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(f);
      });
      setRefImages((cur) => [...cur, {
        base64,
        mediaType: f.type as RefImage['mediaType'],
        preview: base64,
      }]);
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const it of Array.from(items)) {
      if (it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      handleFiles(files);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) setDragOver(true);
  }
  function onDragLeave(e: React.DragEvent) {
    if (e.currentTarget === e.target) setDragOver(false);
  }

  async function send(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text || loading) return;
    const previews = refImages.map((i) => i.preview);
    setMessages((m) => [...m, { role: 'user', text, ts: Date.now(), images: previews }]);
    setInput('');
    setLoading(true);

    try {
      const ctxKind = selected?.kind ?? 'page';
      let current: unknown = content;
      if (selected?.kind === 'element') {
        current = content.sections
          .find((s) => s.id === selected.sectionId)
          ?.columns.find((c) => c.id === selected.columnId)
          ?.elements.find((e) => e.id === selected.elementId);
      } else if (selected?.kind === 'section') {
        current = content.sections.find((s) => s.id === selected.sectionId);
      }

      // Layout context: snapshot ridotto della pagina (per non sforare token)
      const pageLayout = {
        title: pageTitle,
        sections: content.sections.map((sec) => ({
          id: sec.id,
          settings: sec.settings,
          columns: sec.columns.map((c) => ({
            id: c.id,
            width: c.width,
            elements: c.elements.map((el) => ({ id: el.id, type: el.type })),
          })),
        })),
      };

      const images = refImages.map((i) => ({ base64: i.base64, mediaType: i.mediaType }));

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: text, context: ctxKind, current, pageLayout, images }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Errore AI');
      }
      const data = await res.json() as { kind: string; result: unknown };

      // Reset reference images dopo invio
      setRefImages([]);

      if (data.kind === 'section') {
        const newSection = data.result as SectionNode;
        if (selected?.kind === 'section') {
          // Sostituisci la sezione selezionata in-place (mantenendo lo stesso id e posizione)
          replaceSection(selected.sectionId, newSection);
          setMessages((m) => [...m, { role: 'assistant', text: 'Sezione aggiornata.', ts: Date.now() }]);
          toast.success('Sezione aggiornata');
        } else {
          appendSection(newSection);
          setMessages((m) => [...m, { role: 'assistant', text: 'Sezione aggiunta in fondo alla pagina.', ts: Date.now() }]);
          toast.success('Sezione aggiunta');
          setTimeout(() => {
            const canvas = document.querySelector('.editor-canvas');
            canvas?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }, 100);
        }
      } else if (data.kind === 'page') {
        replaceContent(data.result as PageContent);
        setMessages((m) => [...m, { role: 'assistant', text: 'Pagina rigenerata. Salva per confermare.', ts: Date.now() }]);
        toast.success('Pagina rigenerata');
      } else if (data.kind === 'element') {
        if (selected?.kind === 'element') {
          const el = data.result as ElementNode;
          updateElement(selected.sectionId, selected.columnId, selected.elementId, el.settings);
          setMessages((m) => [...m, { role: 'assistant', text: 'Widget aggiornato.', ts: Date.now() }]);
          toast.success('Widget aggiornato');
        } else {
          setMessages((m) => [...m, { role: 'assistant', text: 'Seleziona prima un widget nel canvas (click), poi chiedimi la modifica.', ts: Date.now() }]);
        }
      } else {
        setMessages((m) => [...m, { role: 'assistant', text: 'Risposta AI non interpretabile. Riprova con prompt diverso.', ts: Date.now() }]);
      }
    } catch (err) {
      toast.error('Errore AI', { description: (err as Error).message });
      setMessages((m) => [...m, { role: 'assistant', text: 'Errore: ' + (err as Error).message, ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }

  // Calcolo etichetta del target per banner
  let targetLabel: string | null = null;
  if (selected?.kind === 'element') {
    const el = content.sections
      .find((s) => s.id === selected.sectionId)
      ?.columns.find((c) => c.id === selected.columnId)
      ?.elements.find((e) => e.id === selected.elementId);
    if (el) targetLabel = `widget "${el.type}"`;
  } else if (selected?.kind === 'section') targetLabel = 'sezione selezionata';
  else if (selected?.kind === 'column') targetLabel = 'colonna selezionata';

  return (
    <aside className="w-96 bg-card border-l flex flex-col shrink-0">
      <div className="h-12 border-b flex items-center justify-between px-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#92003b] to-[#a4286a] flex items-center justify-center text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          AI Assistant
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      {targetLabel && (
        <div className="px-3 py-2 border-b bg-primary/10 text-xs flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="flex-1">Modificherà <b>{targetLabel}</b></span>
          <button
            onClick={() => select(null)}
            className="p-0.5 rounded hover:bg-background/60 transition-colors shrink-0"
            title="Rimuovi target (lavora sull'intera pagina)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div
        className={`flex-1 overflow-y-auto p-3 space-y-3 relative transition-all ${dragOver ? 'ring-2 ring-[#92003b] ring-inset bg-[#92003b]/5' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {dragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/90 pointer-events-none">
            <div className="border-2 border-dashed border-[#92003b] rounded-xl px-8 py-6 text-center">
              <div className="text-3xl mb-2">📎</div>
              <div className="text-sm font-semibold text-[#92003b]">Rilascia qui per allegare</div>
              <div className="text-xs text-muted-foreground mt-1">L&apos;immagine sarà inviata come riferimento all&apos;AI</div>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {m.images && m.images.length > 0 && (
                <div className="flex gap-1 mb-2 flex-wrap">
                  {m.images.map((src, k) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={k} src={src} alt="" className="w-16 h-16 object-cover rounded" />
                  ))}
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-3 py-2 text-sm flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Sto pensando...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && refImages.length === 0 && (
        <div className="px-3 pb-2 space-y-1.5">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Wand2 className="h-3 w-3" /> Idee veloci</div>
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="w-full text-left text-xs px-2 py-1.5 rounded border hover:border-primary hover:bg-primary/5 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="border-t p-3 space-y-2">
        {/* Reference images preview */}
        {refImages.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {refImages.map((img, idx) => (
              <div key={idx} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="w-14 h-14 object-cover rounded border" />
                <button
                  onClick={() => setRefImages((c) => c.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="Descrivi cosa vuoi creare... (puoi incollare/trascinare immagini di riferimento)"
          disabled={loading}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || refImages.length >= 5}
            title="Allega immagine di riferimento"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button onClick={() => send()} disabled={loading || !input.trim()} className="flex-1" size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Genera
          </Button>
        </div>
      </div>
    </aside>
  );
}
