'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useEditor } from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X, Send, Loader2, Wand2, Image as ImageIcon, Paperclip, KeyRound, ExternalLink, RefreshCw } from 'lucide-react';
import type { SectionNode, ElementNode, PageContent } from '@/lib/widgets-schema';
import { t } from '@/lib/admin-i18n';

type Message = { role: 'user' | 'assistant'; text: string; ts: number; images?: string[] };

const QUICK_PROMPTS = [
  t('Crea una sezione hero con titolo, sottotitolo e bottone CTA', 'Create a hero section with title, subtitle and CTA button'),
  t('Aggiungi una sezione "Servizi" con 3 box icona', 'Add a "Services" section with 3 icon boxes'),
  t('Genera una sezione testimonianze con 3 recensioni', 'Generate a testimonials section with 3 reviews'),
  t('Crea un FAQ con 5 domande comuni', 'Create an FAQ with 5 common questions'),
  t('Aggiungi un contact form completo', 'Add a complete contact form'),
  t('Genera una pricing table con 3 piani', 'Generate a pricing table with 3 plans'),
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
      text: t('Ciao, dimmi cosa vuoi creare o modificare.', 'Hi, tell me what you want to create or edit.'),
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

  // Gate: la chat funziona solo con una chiave Anthropic configurata.
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [checkingKey, setCheckingKey] = useState(false);
  const checkAiStatus = async () => {
    setCheckingKey(true);
    try {
      const res = await fetch('/api/ai/status');
      const j = await res.json();
      setAiConfigured(res.ok ? Boolean(j.configured) : true);
    } catch {
      setAiConfigured(true); // in dubbio non blocchiamo: l'errore emergerà dalla chiamata
    } finally {
      setCheckingKey(false);
    }
  };
  useEffect(() => {
    checkAiStatus();
  }, []);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    for (const f of list.slice(0, 5 - refImages.length)) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(t(`${f.name}: troppo grande (max 5MB)`, `${f.name}: too large (max 5MB)`));
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
      // La colonna non è un context dell'API: la trattiamo come sezione,
      // indicando al modello quale colonna è selezionata.
      const ctxKind = selected?.kind === 'column' ? 'section' : (selected?.kind ?? 'page');
      let promptForApi = text;
      let current: unknown = content;
      if (selected?.kind === 'element') {
        current = content.sections
          .find((s) => s.id === selected.sectionId)
          ?.columns.find((c) => c.id === selected.columnId)
          ?.elements.find((e) => e.id === selected.elementId);
      } else if (selected?.kind === 'section') {
        current = content.sections.find((s) => s.id === selected.sectionId);
      } else if (selected?.kind === 'column') {
        current = content.sections.find((s) => s.id === selected.sectionId);
        promptForApi = `${text}\n\n[L'utente ha selezionato la colonna con id "${selected.columnId}" di questa sezione: applica la modifica a QUELLA colonna, lasciando invariato il resto della sezione.]`;
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
        body: JSON.stringify({ prompt: promptForApi, context: ctxKind, current, pageLayout, images }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? t('Errore AI', 'AI error'));
      }
      const data = await res.json() as { kind: string; result: unknown };

      // Reset reference images dopo invio
      setRefImages([]);

      if (data.kind === 'section') {
        const newSection = data.result as SectionNode;
        if (selected?.kind === 'section' || selected?.kind === 'column') {
          // Sostituisci la sezione selezionata in-place (mantenendo lo stesso id e posizione)
          replaceSection(selected.sectionId, newSection);
          setMessages((m) => [...m, { role: 'assistant', text: t('Sezione aggiornata.', 'Section updated.'), ts: Date.now() }]);
          toast.success(t('Sezione aggiornata', 'Section updated'));
        } else {
          appendSection(newSection);
          setMessages((m) => [...m, { role: 'assistant', text: t('Sezione aggiunta in fondo alla pagina.', 'Section added at the bottom of the page.'), ts: Date.now() }]);
          toast.success(t('Sezione aggiunta', 'Section added'));
          setTimeout(() => {
            const canvas = document.querySelector('.editor-canvas');
            canvas?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }, 100);
        }
      } else if (data.kind === 'page') {
        replaceContent(data.result as PageContent);
        setMessages((m) => [...m, { role: 'assistant', text: t('Pagina rigenerata. Salva per confermare.', 'Page regenerated. Save to confirm.'), ts: Date.now() }]);
        toast.success(t('Pagina rigenerata', 'Page regenerated'));
      } else if (data.kind === 'element') {
        if (selected?.kind === 'element') {
          const el = data.result as ElementNode;
          updateElement(selected.sectionId, selected.columnId, selected.elementId, el.settings);
          setMessages((m) => [...m, { role: 'assistant', text: t('Widget aggiornato.', 'Widget updated.'), ts: Date.now() }]);
          toast.success(t('Widget aggiornato', 'Widget updated'));
        } else {
          setMessages((m) => [...m, { role: 'assistant', text: t('Seleziona prima un widget nel canvas (click), poi chiedimi la modifica.', 'First select a widget on the canvas (click), then ask me for the change.'), ts: Date.now() }]);
        }
      } else {
        setMessages((m) => [...m, { role: 'assistant', text: t('Risposta AI non interpretabile. Riprova con prompt diverso.', 'Could not parse the AI response. Try a different prompt.'), ts: Date.now() }]);
      }
    } catch (err) {
      toast.error(t('Errore AI', 'AI error'), { description: (err as Error).message });
      setMessages((m) => [...m, { role: 'assistant', text: t('Errore: ', 'Error: ') + (err as Error).message, ts: Date.now() }]);
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
    if (el) targetLabel = t(`widget "${el.type}"`, `the "${el.type}" widget`);
  } else if (selected?.kind === 'section') targetLabel = t('sezione selezionata', 'the selected section');
  else if (selected?.kind === 'column') targetLabel = t('colonna selezionata', 'the selected column');

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

      {aiConfigured === false && (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="border rounded-xl p-5 bg-muted/30 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <KeyRound className="h-4 w-4 text-amber-700" />
              </div>
              <div className="font-semibold text-sm">{t("Configura la chiave API per usare l'AI", 'Set up the API key to use the AI')}</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("L'assistente usa Claude con la", 'The assistant uses Claude with')} <b>{t('tua', 'your own')}</b> {t("API key Anthropic: paghi solo l'uso effettivo (tipicamente pochi euro al mese), senza abbonamenti aggiuntivi.", 'Anthropic API key: you only pay for actual usage (typically a few euros per month), with no extra subscriptions.')}
            </p>
            <ol className="space-y-3 text-xs leading-relaxed">
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">1</span>
                <span>
                  {t('Genera la chiave su', 'Generate your key at')}{' '}
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5">
                    console.anthropic.com <ExternalLink className="h-3 w-3" />
                  </a>
                  {' '}{t('(API Keys → Create key; serve un metodo di pagamento attivo).', '(API Keys → Create key; an active payment method is required).')}
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">2</span>
                <span>
                  {t('Incollala in', 'Paste it into')}{' '}
                  <a href="/admin/settings/site?tab=integrations" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                    {t('Impostazioni → Integrazioni', 'Settings → Integrations')}
                  </a>
                  {t(', card "AI Anthropic (Claude)", e salva.', ', "AI Anthropic (Claude)" card, and save.')}
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">3</span>
                <span>{t('Torna qui e premi "Ricontrolla": la chat si sblocca subito.', 'Come back here and press "Re-check": the chat unlocks right away.')}</span>
              </li>
            </ol>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={checkAiStatus} disabled={checkingKey}>
                {checkingKey ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                {t('Ricontrolla', 'Re-check')}
              </Button>
              <a
                href="https://elementnode.cloud/it/docs#ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground underline underline-offset-2"
              >
                {t('Guida completa', 'Full guide')}
              </a>
            </div>
          </div>
        </div>
      )}

      {aiConfigured === null && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('Verifico la configurazione AI…', 'Checking the AI configuration…')}
          </div>
        </div>
      )}

      {aiConfigured === true && targetLabel && (
        <div className="px-3 py-2 border-b bg-primary/10 text-xs flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="flex-1">{t('Modificherà', 'Will edit')} <b>{targetLabel}</b></span>
          <button
            onClick={() => select(null)}
            className="p-0.5 rounded hover:bg-background/60 transition-colors shrink-0"
            title={t("Rimuovi target (lavora sull'intera pagina)", 'Remove target (work on the whole page)')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {aiConfigured === true && (
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
              <div className="text-sm font-semibold text-[#92003b]">{t('Rilascia qui per allegare', 'Drop here to attach')}</div>
              <div className="text-xs text-muted-foreground mt-1">{t("L'immagine sarà inviata come riferimento all'AI", 'The image will be sent to the AI as a reference')}</div>
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
            <div className="bg-muted rounded-2xl px-4 py-3">
              <span className="en-ai-thinking" aria-label={t('Generazione in corso', 'Generating')}>
                <span /><span /><span />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      )}

      {aiConfigured === true && messages.length <= 1 && refImages.length === 0 && (
        <div className="px-3 pb-2 space-y-1.5">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Wand2 className="h-3 w-3" /> {t('Idee veloci', 'Quick ideas')}</div>
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

      {aiConfigured === true && (
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
          placeholder={t('Descrivi cosa vuoi creare... (puoi incollare/trascinare immagini di riferimento)', 'Describe what you want to create... (you can paste/drag reference images)')}
          disabled={loading}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || refImages.length >= 5}
            title={t('Allega immagine di riferimento', 'Attach a reference image')}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button onClick={() => send()} disabled={loading || !input.trim()} className="flex-1" size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t('Genera', 'Generate')}
          </Button>
        </div>
      </div>
      )}
    </aside>
  );
}
