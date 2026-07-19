'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MediaUploader } from './uploader';
import { formatBytes, formatDate } from '@/lib/utils';
import {
  Image as ImageIcon, FileText, Film, Music, File,
  Search, Grid3x3, List, Trash2, Pencil, Copy as CopyIcon,
  X, Download, ExternalLink, Check, Square, CheckSquare, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  variants: unknown;
  blurhash: string | null;
  uploaderId: string | null;
  createdAt: string;
}

type FilterKind = 'all' | 'image' | 'svg' | 'video' | 'audio' | 'document';
type ViewMode = 'grid' | 'list';

/** Miniatura via optimizer di Next (webp ridimensionato, cache su disco).
 *  SVG/GIF ed esterne restano dirette. */
function thumbUrl(url: string, mime: string, w: number): string {
  if (!mime.startsWith('image/') || mime === 'image/svg+xml' || mime === 'image/gif') return url;
  if (!url.startsWith('/')) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=60`;
}

function iconFor(mime: string) {
  if (mime.startsWith('image/svg')) return ImageIcon;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return Film;
  if (mime.startsWith('audio/')) return Music;
  if (mime.includes('pdf') || mime.includes('document')) return FileText;
  return File;
}

function matchKind(mime: string, kind: FilterKind): boolean {
  if (kind === 'all') return true;
  if (kind === 'image') return mime.startsWith('image/') && !mime.includes('svg');
  if (kind === 'svg') return mime.includes('svg');
  if (kind === 'video') return mime.startsWith('video/');
  if (kind === 'audio') return mime.startsWith('audio/');
  if (kind === 'document') return mime.includes('pdf') || mime.includes('document') || mime.includes('msword') || mime.includes('spreadsheet');
  return false;
}

export function MediaLibrary({ initialItems }: { initialItems: MediaItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState('');
  const [filterKind, setFilterKind] = useState<FilterKind>('all');
  const [view, setView] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<MediaItem | null>(null);
  const [, startTransition] = useTransition();

  // Refresh from server
  async function refresh() {
    const r = await fetch('/api/media');
    if (r.ok) setItems(await r.json());
  }

  const filtered = useMemo(() => {
    return items.filter((m) => {
      if (!matchKind(m.mime, filterKind)) return false;
      if (search && !m.filename.toLowerCase().includes(search.toLowerCase()) && !(m.alt || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, search, filterKind]);

  const counts = useMemo(() => ({
    all: items.length,
    image: items.filter((m) => matchKind(m.mime, 'image')).length,
    svg: items.filter((m) => matchKind(m.mime, 'svg')).length,
    video: items.filter((m) => matchKind(m.mime, 'video')).length,
    audio: items.filter((m) => matchKind(m.mime, 'audio')).length,
    document: items.filter((m) => matchKind(m.mime, 'document')).length,
  }), [items]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function selectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((m) => m.id)));
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Cancellare ${selected.size} file? L'azione è irreversibile.`)) return;
    const ids = [...selected];
    startTransition(async () => {
      let okCount = 0, errCount = 0, inUseCount = 0;
      for (const id of ids) {
        const r = await fetch(`/api/media/${id}`, { method: 'DELETE' });
        if (r.ok) okCount++;
        else if (r.status === 409) inUseCount++;
        else errCount++;
      }
      if (okCount) toast.success(`${okCount} file cancellati`);
      if (inUseCount) toast.warning(`${inUseCount} file in uso (usa "forza" dal dettaglio per cancellarli)`);
      if (errCount) toast.error(`${errCount} errori`);
      setSelected(new Set());
      refresh();
    });
  }

  async function deleteOne(id: string, force = false) {
    const r = await fetch(`/api/media/${id}${force ? '?force=1' : ''}`, { method: 'DELETE' });
    if (r.ok) {
      toast.success('File cancellato');
      setItems((p) => p.filter((m) => m.id !== id));
      setDetail(null);
      return true;
    }
    if (r.status === 409) {
      const data = await r.json();
      if (confirm(`${data.message}\nForzare la cancellazione?`)) return deleteOne(id, true);
      return false;
    }
    toast.error('Errore cancellazione');
    return false;
  }

  async function updateMedia(id: string, patch: { filename?: string; alt?: string | null }) {
    const r = await fetch(`/api/media/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      const updated = await r.json();
      setItems((p) => p.map((m) => (m.id === id ? { ...m, ...updated } : m)));
      if (detail?.id === id) setDetail({ ...detail, ...updated });
      toast.success('Aggiornato');
      return true;
    }
    toast.error('Errore salvataggio');
    return false;
  }

  function copyUrl(url: string) {
    navigator.clipboard?.writeText(window.location.origin + url);
    toast.success('URL copiato');
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Libreria Media</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} di {items.length} file</p>
        </div>
        <MediaUploader />
      </div>

      {/* Toolbar: filtri + search + view toggle */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            <FilterBtn label="Tutti" count={counts.all} active={filterKind === 'all'} onClick={() => setFilterKind('all')} />
            <FilterBtn label="Immagini" count={counts.image} active={filterKind === 'image'} onClick={() => setFilterKind('image')} />
            <FilterBtn label="SVG" count={counts.svg} active={filterKind === 'svg'} onClick={() => setFilterKind('svg')} />
            <FilterBtn label="Video" count={counts.video} active={filterKind === 'video'} onClick={() => setFilterKind('video')} />
            <FilterBtn label="Documenti" count={counts.document} active={filterKind === 'document'} onClick={() => setFilterKind('document')} />
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-[400px] ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cerca per nome o alt…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button
              variant={view === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setView('grid')}
              title="Vista griglia"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setView('list')}
              title="Vista lista"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
            <div className="text-sm font-medium">{selected.size} selezionati</div>
            <Button variant="ghost" size="sm" onClick={selectAll} className="h-8 text-xs">
              {selected.size === filtered.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete} className="h-8 text-xs ml-auto">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Cancella {selected.size}
            </Button>
          </div>
        )}
      </Card>

      {/* Items grid/list */}
      {filtered.length === 0 ? (
        <Card className="p-16 text-center">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">{items.length === 0 ? 'Nessun media caricato' : 'Nessun risultato per i filtri attivi'}</p>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((m) => (
            <MediaCard
              key={m.id}
              media={m}
              isSelected={selected.has(m.id)}
              onSelect={() => toggleSelect(m.id)}
              onOpen={() => setDetail(m)}
              onCopyUrl={() => copyUrl(m.url)}
              onDelete={() => deleteOne(m.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="w-10 p-2 text-left">
                  <button onClick={selectAll} className="hover:bg-muted/60 p-1 rounded">
                    {selected.size > 0 && selected.size === filtered.length ?
                      <CheckSquare className="h-4 w-4" /> :
                      <Square className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </th>
                <th className="w-12 p-2 text-left">Anteprima</th>
                <th className="p-2 text-left">Nome file</th>
                <th className="p-2 text-left hidden md:table-cell">Tipo</th>
                <th className="p-2 text-left hidden md:table-cell">Dimensioni</th>
                <th className="p-2 text-left hidden lg:table-cell">Peso</th>
                <th className="p-2 text-left hidden lg:table-cell">Caricato</th>
                <th className="w-32 p-2 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const Icon = iconFor(m.mime);
                const isSel = selected.has(m.id);
                return (
                  <tr key={m.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="p-2">
                      <button onClick={() => toggleSelect(m.id)} className="p-1 hover:bg-muted/60 rounded">
                        {isSel ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => setDetail(m)}
                        className="w-10 h-10 bg-muted rounded flex items-center justify-center overflow-hidden hover:opacity-80 transition"
                      >
                        {m.mime.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbUrl(m.url, m.mime, 96)} alt={m.alt ?? m.filename} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="p-2">
                      <button onClick={() => setDetail(m)} className="text-left hover:underline">
                        <div className="font-medium truncate max-w-[300px]">{m.filename}</div>
                        {m.alt && <div className="text-xs text-muted-foreground truncate max-w-[300px]">{m.alt}</div>}
                      </button>
                    </td>
                    <td className="p-2 text-muted-foreground hidden md:table-cell text-xs">{m.mime}</td>
                    <td className="p-2 text-muted-foreground hidden md:table-cell text-xs">
                      {m.width && m.height ? `${m.width}×${m.height}` : '—'}
                    </td>
                    <td className="p-2 text-muted-foreground hidden lg:table-cell text-xs">{formatBytes(m.size)}</td>
                    <td className="p-2 text-muted-foreground hidden lg:table-cell text-xs">{formatDate(m.createdAt)}</td>
                    <td className="p-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyUrl(m.url)} title="Copia URL">
                          <CopyIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetail(m)} title="Modifica">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteOne(m.id)} title="Elimina">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Detail drawer */}
      {detail && (
        <MediaDetailDrawer
          media={detail}
          onClose={() => setDetail(null)}
          onUpdate={(patch) => updateMedia(detail.id, patch)}
          onDelete={() => deleteOne(detail.id)}
          onCopyUrl={() => copyUrl(detail.url)}
        />
      )}
    </div>
  );
}

function FilterBtn({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 text-xs font-medium rounded-md transition ${
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
      }`}
    >
      {label} <span className={`ml-1 ${active ? 'opacity-70' : 'text-muted-foreground'}`}>({count})</span>
    </button>
  );
}

function MediaCard({
  media, isSelected, onSelect, onOpen, onCopyUrl, onDelete,
}: {
  media: MediaItem; isSelected: boolean;
  onSelect: () => void; onOpen: () => void; onCopyUrl: () => void; onDelete: () => void;
}) {
  const Icon = iconFor(media.mime);
  return (
    <Card className={`overflow-hidden group relative cursor-pointer transition ${isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}>
      {/* Select checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center transition ${
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-white/90 backdrop-blur opacity-0 group-hover:opacity-100 border'
        }`}
        title={isSelected ? 'Deseleziona' : 'Seleziona'}
      >
        {isSelected ? <Check className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
      </button>

      {/* Quick actions (hover) */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={(e) => { e.stopPropagation(); onCopyUrl(); }}
          className="w-7 h-7 rounded-md bg-white/90 backdrop-blur border hover:bg-white flex items-center justify-center"
          title="Copia URL"
        >
          <CopyIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-7 h-7 rounded-md bg-white/90 backdrop-blur border hover:bg-red-50 text-destructive flex items-center justify-center"
          title="Elimina"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <button onClick={onOpen} className="block w-full text-left">
        <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
          {media.mime.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl(media.url, media.mime, 384)} alt={media.alt ?? media.filename} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <Icon className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <div className="p-2 text-xs">
          <div className="truncate font-medium" title={media.filename}>{media.filename}</div>
          <div className="text-muted-foreground">{formatBytes(media.size)} · {formatDate(media.createdAt)}</div>
        </div>
      </button>
    </Card>
  );
}

function MediaDetailDrawer({
  media, onClose, onUpdate, onDelete, onCopyUrl,
}: {
  media: MediaItem;
  onClose: () => void;
  onUpdate: (patch: { filename?: string; alt?: string | null }) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onCopyUrl: () => void;
}) {
  const [filename, setFilename] = useState(media.filename);
  const [alt, setAlt] = useState(media.alt || '');
  const [usedIn, setUsedIn] = useState<{ kind: string; id: string; title: string }[]>([]);
  const [loadingUsedIn, setLoadingUsedIn] = useState(true);
  const Icon = iconFor(media.mime);

  useEffect(() => {
    setFilename(media.filename);
    setAlt(media.alt || '');
    setLoadingUsedIn(true);
    fetch(`/api/media/${media.id}`).then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setUsedIn(data.usedIn || []);
      }
      setLoadingUsedIn(false);
    });
  }, [media.id, media.filename, media.alt]);

  async function save() {
    const patch: { filename?: string; alt?: string | null } = {};
    if (filename !== media.filename) patch.filename = filename;
    if (alt !== (media.alt || '')) patch.alt = alt || null;
    if (Object.keys(patch).length === 0) return;
    await onUpdate(patch);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-end animate-in fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card w-full max-w-2xl h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right">
        <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between gap-2 z-10">
          <h3 className="font-semibold truncate">Dettaglio media</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Preview */}
          <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
            {media.mime.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbUrl(media.url, media.mime, 1280)} alt={media.alt ?? media.filename} decoding="async" className="max-w-full max-h-[500px]" />
            ) : (
              <Icon className="h-24 w-24 text-muted-foreground" />
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Meta label="Tipo" value={media.mime} />
            <Meta label="Peso" value={formatBytes(media.size)} />
            <Meta label="Dimensioni" value={media.width && media.height ? `${media.width} × ${media.height} px` : '—'} />
            <Meta label="Caricato" value={formatDate(media.createdAt)} />
          </div>

          {/* URL */}
          <div>
            <Label className="text-xs">URL pubblico</Label>
            <div className="flex gap-2 mt-1">
              <Input value={media.url} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={onCopyUrl}>
                <CopyIcon className="h-3.5 w-3.5 mr-1" /> Copia
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={media.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Apri
                </a>
              </Button>
            </div>
          </div>

          {/* Edit filename */}
          <div>
            <Label htmlFor="filename" className="text-xs">Nome file</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              onBlur={save}
              className="mt-1"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Solo informativo: l&apos;URL del file non cambia (per evitare link rotti).</p>
          </div>

          {/* Edit alt */}
          <div>
            <Label htmlFor="alt" className="text-xs">Testo alternativo (alt)</Label>
            <Textarea
              id="alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              onBlur={save}
              placeholder="Descrizione per accessibilità e SEO"
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Used in */}
          <div>
            <Label className="text-xs">Usato in</Label>
            {loadingUsedIn ? (
              <div className="text-xs text-muted-foreground mt-1">Ricerca riferimenti…</div>
            ) : usedIn.length === 0 ? (
              <div className="text-xs text-muted-foreground mt-1">Non riferito in nessuna pagina, theme block o post.</div>
            ) : (
              <ul className="mt-1 text-sm space-y-1">
                {usedIn.map((u, i) => (
                  <li key={`${u.kind}-${u.id}-${i}`} className="flex items-center gap-2 text-xs">
                    <span className="inline-block px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium uppercase">{u.kind}</span>
                    {u.title}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-4 flex items-center gap-2 flex-wrap">
            <Button variant="default" size="sm" onClick={save}>
              <Check className="h-3.5 w-3.5 mr-1" /> Salva modifiche
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={media.url} download={media.filename}>
                <Download className="h-3.5 w-3.5 mr-1" /> Scarica
              </a>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="ml-auto"
              onClick={async () => {
                if (confirm(`Cancellare "${media.filename}"?`)) {
                  await onDelete();
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Elimina file
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-medium mt-0.5 break-all">{value}</div>
    </div>
  );
}
