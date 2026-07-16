'use client';

import Link from 'next/link';
import { useEditor } from '@/lib/editor-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Save,
  Eye,
  Sparkles,
  Loader2,
  Globe,
  Search,
  Settings2,
  Layers,
} from 'lucide-react';

export function TopBar({
  slug,
  status,
  saving,
  onSave,
  onPublish,
  onToggleAI,
  aiOpen,
  onToggleSEO,
  seoOpen,
  onTogglePageSettings,
  onToggleNavigator,
  navigatorOpen,
  entityKind = 'page',
  blockKind,
  postTypeSlug,
}: {
  slug: string;
  status: string;
  saving: boolean;
  onSave: () => void;
  onPublish: () => void;
  onToggleAI: () => void;
  aiOpen: boolean;
  onToggleSEO?: () => void;
  seoOpen?: boolean;
  onTogglePageSettings?: () => void;
  onToggleNavigator?: () => void;
  navigatorOpen?: boolean;
  entityKind?: 'page' | 'theme-block' | 'post' | 'popup';
  blockKind?: 'HEADER' | 'FOOTER';
  postTypeSlug?: string;
}) {
  const device = useEditor((s) => s.device);
  const setDevice = useEditor((s) => s.setDevice);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const history = useEditor((s) => s.history.length);
  const future = useEditor((s) => s.future.length);
  const isDirty = useEditor((s) => s.isDirty);
  const title = useEditor((s) => s.pageTitle);
  const setTitle = useEditor((s) => s.setTitle);

  return (
    <div className="h-14 bg-card border-b flex items-center px-3 gap-2 shrink-0">
      <Button asChild variant="ghost" size="icon" title="Torna indietro">
        <Link href={
          entityKind === 'theme-block' ? '/admin/theme-builder'
          : entityKind === 'post' ? `/admin/posts?type=${postTypeSlug ?? 'post'}`
          : entityKind === 'popup' ? '/admin/popups'
          : '/admin/pages'
        }><ArrowLeft className="h-4 w-4" /></Link>
      </Button>
      {entityKind === 'theme-block' && blockKind && <Badge variant="secondary">{blockKind}</Badge>}
      {entityKind === 'post' && postTypeSlug && <Badge variant="secondary">{postTypeSlug}</Badge>}
      {entityKind === 'popup' && <Badge variant="secondary">POPUP</Badge>}
      <div className="w-px h-6 bg-border" />

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-transparent text-sm font-semibold focus:outline-none focus:bg-muted rounded px-2 py-1 max-w-xs"
      />
      <Badge variant={status === 'PUBLISHED' ? 'success' : 'outline'}>{status}</Badge>
      {isDirty && <Badge variant="destructive">Non salvato</Badge>}

      <div className="flex-1 flex justify-center">
        <div className="flex items-center bg-muted rounded-lg p-1">
          <Button
            variant={device === 'desktop' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setDevice('desktop')}
            className="h-7 w-7"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={device === 'tablet' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setDevice('tablet')}
            className="h-7 w-7"
          >
            <Tablet className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={device === 'mobile' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setDevice('mobile')}
            className="h-7 w-7"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Button variant="ghost" size="icon" onClick={undo} disabled={history === 0} title="Annulla (⌘Z)">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={redo} disabled={future === 0} title="Ripeti (⌘⇧Z)">
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {onToggleNavigator && (
        <Button
          variant={navigatorOpen ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleNavigator}
          className="gap-2"
          title="Navigatore (struttura pagina)"
        >
          <Layers className="h-4 w-4" />
        </Button>
      )}
      {onTogglePageSettings && (
        <Button
          variant="outline"
          size="sm"
          onClick={onTogglePageSettings}
          className="gap-2"
          title="Impostazioni pagina"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      )}
      {onToggleSEO && (
        <Button
          variant={seoOpen ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleSEO}
          className="gap-2"
        >
          <Search className="h-4 w-4" /> SEO
        </Button>
      )}
      <Button
        variant={aiOpen ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleAI}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" /> AI
      </Button>

      {entityKind === 'page' && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/${slug === 'home' ? '' : slug}`} target="_blank">
            <Eye className="h-4 w-4" /> Anteprima
          </Link>
        </Button>
      )}
      {entityKind === 'post' && postTypeSlug && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/${postTypeSlug}/${slug}`} target="_blank">
            <Eye className="h-4 w-4" /> Anteprima
          </Link>
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salva
      </Button>
      <Button size="sm" onClick={onPublish} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Pubblica
      </Button>
    </div>
  );
}
