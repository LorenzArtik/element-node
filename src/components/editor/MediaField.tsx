'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image as ImageIcon, Upload, Loader2, X } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mime: string;
}

export function MediaField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetch('/api/media').then(r => r.json()).then(setItems).catch(() => {});
    }
  }, [open]);

  async function upload(file: File) {
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      onChange(data.url);
      setOpen(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." className="flex-1" />
        <Button variant="outline" size="icon" onClick={() => setOpen(true)} title="Sfoglia libreria">
          <ImageIcon className="h-4 w-4" />
        </Button>
        {value && (
          <Button variant="outline" size="icon" onClick={() => onChange('')} title="Rimuovi">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="rounded border w-full max-h-32 object-contain bg-muted" />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Libreria media</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end">
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <Button onClick={() => inputRef.current?.click()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Carica nuovo
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
            {items.map((m) => (
              <button
                key={m.id}
                onClick={() => { onChange(m.url); setOpen(false); }}
                className="aspect-square border rounded overflow-hidden hover:border-primary group relative"
              >
                {m.mime.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted text-xs">{m.filename}</div>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
