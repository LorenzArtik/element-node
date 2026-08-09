'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/admin-i18n';

/**
 * Pulsante duplica generico. POST sull'endpoint per clonare l'entità.
 * Funziona con /api/pages/[id], /api/posts/[id], /api/post-types/[id], ecc.
 */
export function DuplicateButton({
  endpoint,
  redirectTo,
  size = 'icon',
  label,
}: {
  endpoint: string;
  redirectTo?: 'editor' | 'list' | string;
  size?: 'icon' | 'sm';
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? t('Errore duplicazione', 'Duplication error'));
      }
      const data = await res.json();
      toast.success(t('Duplicato', 'Duplicated'));
      if (redirectTo === 'editor' && data.id) {
        // Nuova entità: porta all'editor (per page/post)
        if (endpoint.includes('/posts/')) router.push(`/editor/post/${data.id}`);
        else if (endpoint.includes('/pages/')) router.push(`/editor/${data.id}`);
        else router.refresh();
      } else {
        router.refresh();
      }
    } catch (e) {
      toast.error(t('Errore', 'Error'), { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size={size} onClick={onClick} disabled={loading} title={label ?? t('Duplica', 'Duplicate')}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
      {size !== 'icon' && (label ?? t('Duplica', 'Duplicate'))}
    </Button>
  );
}
