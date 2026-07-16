'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import * as LucideIcons from 'lucide-react';
import { useEditor } from '@/lib/editor-store';
import type { PageContent, WidgetType } from '@/lib/widgets-schema';
import dynamic from 'next/dynamic';
import { WIDGETS } from '@/lib/widgets-schema';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { Canvas } from './Canvas';
import { Navigator as ENNavigator } from './Navigator';
import type { SeoMeta } from './SeoPanel';

// Lazy-load: AIChat carica @anthropic-ai sdk markdown rendering, SeoPanel carica analyzer
const AIChat = dynamic(() => import('./AIChat').then(m => ({ default: m.AIChat })), { ssr: false });
const SeoPanel = dynamic(() => import('./SeoPanel').then(m => ({ default: m.SeoPanel })), { ssr: false });
const PageSettingsDrawer = dynamic(() => import('./PageSettingsDrawer').then(m => ({ default: m.PageSettingsDrawer })), { ssr: false });

export type EditorEntityKind = 'page' | 'theme-block' | 'post' | 'popup';

interface Props {
  entityKind?: EditorEntityKind;
  pageId: string;
  title: string;
  slug: string;
  status: string;
  content: PageContent;
  // Per theme blocks
  blockKind?: 'HEADER' | 'FOOTER';
  // Per post
  postTypeSlug?: string;
  // SEO meta (per page/post)
  seo?: Partial<SeoMeta>;
  // Settings di pagina/post per il drawer
  pageMeta?: {
    isHomepage?: boolean;
    password?: string | null;
    featured?: string | null;
    excerpt?: string | null;
    publishedAt?: string | null;
  };
}

type DragData =
  | { kind: 'new-widget'; widgetType: WidgetType }
  | { kind: 'new-section'; columns: number }
  | { kind: 'element'; sectionId: string; columnId: string; elementId: string }
  | { kind: 'section'; sectionId: string };

type DropData =
  | { kind: 'insert-element'; sectionId: string; columnId: string; index: number }
  | { kind: 'insert-section'; index: number };

export default function EditorShell({ pageId, title, slug, status, content, entityKind = 'page', blockKind, postTypeSlug, seo, pageMeta }: Props) {
  const init = useEditor((s) => s.init);
  const isDirty = useEditor((s) => s.isDirty);
  const setDirty = useEditor((s) => s.setDirty);
  const stateContent = useEditor((s) => s.content);
  const stateTitle = useEditor((s) => s.pageTitle);
  const addElement = useEditor((s) => s.addElement);
  const moveElement = useEditor((s) => s.moveElement);
  const moveSectionToIndex = useEditor((s) => s.moveSectionToIndex);
  const addSectionAtIndex = useEditor((s) => s.addSectionAtIndex);

  const router = useRouter();
  const [aiOpen, setAiOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [seoMeta, setSeoMeta] = useState<SeoMeta>({
    seoTitle: seo?.seoTitle ?? '',
    seoDesc: seo?.seoDesc ?? '',
    ogImage: seo?.ogImage ?? '',
    noindex: seo?.noindex ?? false,
    canonical: seo?.canonical ?? '',
    focusKeyword: seo?.focusKeyword ?? '',
  });
  const supportsSeo = entityKind === 'page' || entityKind === 'post';

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    init(pageId, title, content);
  }, [pageId, title, content, init]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isDirty]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useEditor.getState().undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        useEditor.getState().redo();
      }
      // Copy/paste/reset STYLE (CMD+ALT+C / CMD+ALT+V / CMD+ALT+R)
      // Funziona se c'è un elemento/colonna/sezione selezionata
      if ((e.metaKey || e.ctrlKey) && e.altKey) {
        const sel = useEditor.getState().selected;
        if (!sel) return;
        const target = {
          kind: sel.kind,
          sectionId: sel.kind === 'section' ? sel.sectionId : sel.sectionId,
          columnId: sel.kind === 'column' || sel.kind === 'element' ? (sel as { columnId: string }).columnId : undefined,
          elementId: sel.kind === 'element' ? (sel as { elementId: string }).elementId : undefined,
        };
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          useEditor.getState().copyStyle(target);
        }
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          useEditor.getState().pasteStyle(target);
        }
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          useEditor.getState().resetStyle(target);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(publish = false) {
    setSaving(true);
    try {
      const url =
        entityKind === 'theme-block' ? `/api/theme-blocks/${pageId}`
        : entityKind === 'post' ? `/api/posts/${pageId}`
        : entityKind === 'popup' ? `/api/popups/${pageId}`
        : `/api/pages/${pageId}`;
      const payload: Record<string, unknown> = {
        name: stateTitle, // theme-block usa "name"
        title: stateTitle, // page/post usa "title"
        content: stateContent,
        ...(publish ? { status: 'PUBLISHED' } : {}),
        ...(supportsSeo ? {
          seoTitle: seoMeta.seoTitle || null,
          seoDesc: seoMeta.seoDesc || null,
          ogImage: seoMeta.ogImage || null,
          noindex: seoMeta.noindex,
          // canonical e focusKeyword non sono ancora persisted nel modello Page/Post
          // (potrebbero essere aggiunti come customFields successivamente)
        } : {}),
      };
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setDirty(false);
      toast.success(publish ? 'Pubblicato!' : 'Salvato');
      router.refresh();
    } catch {
      toast.error('Errore salvataggio');
    } finally {
      setSaving(false);
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveDrag(e.active.data.current as DragData);
  }

  function onDragEnd(e: DragEndEvent) {
    const a = e.active.data.current as DragData | undefined;
    const o = e.over?.data.current as DropData | undefined;
    setActiveDrag(null);
    if (!a || !o) return;

    if (o.kind === 'insert-element') {
      if (a.kind === 'new-widget') {
        addElement(o.sectionId, o.columnId, a.widgetType, o.index);
      } else if (a.kind === 'element') {
        moveElement({
          fromSection: a.sectionId,
          fromColumn: a.columnId,
          elementId: a.elementId,
          toSection: o.sectionId,
          toColumn: o.columnId,
          toIndex: o.index,
        });
      }
    } else if (o.kind === 'insert-section') {
      if (a.kind === 'section') moveSectionToIndex(a.sectionId, o.index);
      else if (a.kind === 'new-section') addSectionAtIndex(a.columns, o.index);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="h-screen flex flex-col bg-muted overflow-hidden">
        <TopBar
          slug={slug}
          status={status}
          saving={saving}
          onSave={() => save(false)}
          onPublish={() => save(true)}
          onToggleAI={() => setAiOpen((v) => !v)}
          aiOpen={aiOpen}
          onToggleSEO={supportsSeo ? () => setSeoOpen((v) => !v) : undefined}
          seoOpen={seoOpen}
          onTogglePageSettings={() => setPageSettingsOpen((v) => !v)}
          onToggleNavigator={() => setNavigatorOpen((v) => !v)}
          navigatorOpen={navigatorOpen}
          entityKind={entityKind}
          blockKind={blockKind}
          postTypeSlug={postTypeSlug}
        />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <Canvas />
          {navigatorOpen && <ENNavigator onClose={() => setNavigatorOpen(false)} />}
          {aiOpen && <AIChat onClose={() => setAiOpen(false)} />}
          {seoOpen && supportsSeo && (
            <SeoPanel
              meta={seoMeta}
              onChange={(m) => { setSeoMeta(m); setDirty(true); }}
              baseUrl={typeof window !== 'undefined' ? window.location.origin : ''}
              slug={slug}
              onClose={() => setSeoOpen(false)}
            />
          )}
        </div>

        {pageSettingsOpen && (
          <PageSettingsDrawer
            open={pageSettingsOpen}
            onOpenChange={setPageSettingsOpen}
            entityKind={entityKind}
            entityId={pageId}
            initial={{
              title: stateTitle,
              slug,
              status,
              isHomepage: pageMeta?.isHomepage,
              password: pageMeta?.password,
              featured: pageMeta?.featured,
              excerpt: pageMeta?.excerpt,
              publishedAt: pageMeta?.publishedAt,
            }}
          />
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag && <DragPreview data={activeDrag} />}
      </DragOverlay>
    </DndContext>
  );
}

function DragPreview({ data }: { data: DragData }) {
  if (data.kind === 'new-widget') {
    const w = WIDGETS[data.widgetType];
    const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[w.icon] ?? LucideIcons.Box;
    return (
      <div className="px-3 py-2 rounded-md bg-white shadow-2xl border-2 border-[#92003b] text-sm font-medium flex items-center gap-2 pointer-events-none">
        <Icon className="h-4 w-4 text-[#92003b]" />
        {w.label}
      </div>
    );
  }
  if (data.kind === 'new-section') {
    return (
      <div className="px-3 py-2 rounded-md bg-white shadow-2xl border-2 border-[#92003b] text-sm font-medium flex items-center gap-2 pointer-events-none">
        <span className="flex gap-0.5 w-6 h-3.5">
          {Array.from({ length: data.columns }).map((_, i) => <span key={i} className="flex-1 bg-[#92003b]" />)}
        </span>
        {data.columns} colonn{data.columns === 1 ? 'a' : 'e'}
      </div>
    );
  }
  if (data.kind === 'element') {
    return (
      <div className="px-3 py-2 rounded-md bg-[#2196f3] text-white text-sm font-medium shadow-2xl pointer-events-none">
        Spostando widget...
      </div>
    );
  }
  return (
    <div className="px-3 py-2 rounded-md bg-[#92003b] text-white text-sm font-medium shadow-2xl pointer-events-none">
      Spostando sezione...
    </div>
  );
}
