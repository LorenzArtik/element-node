'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';

export function MediaUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLoading(true);
    let okCount = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
      if (res.ok) okCount++;
    }
    setLoading(false);
    toast.success(`${okCount} file caricati`);
    router.refresh();
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,video/*,application/pdf"
        onChange={(e) => onUpload(e.target.files)}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={loading} size="lg">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Carica file
      </Button>
    </>
  );
}
