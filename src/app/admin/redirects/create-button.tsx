'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { t } from '@/lib/admin-i18n';

export function CreateRedirectButton() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('/');
  const [to, setTo] = useState('/');
  const [type, setType] = useState('301');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function create() {
    if (!from.startsWith('/')) { toast.error(t('Path "Da" deve iniziare con /', '"From" path must start with /')); return; }
    setLoading(true);
    const res = await fetch('/api/redirects', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fromPath: from, toPath: to, type: Number(type) }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(t('Errore', 'Error'), { description: err?.error?.message });
      return;
    }
    toast.success(t('Creato', 'Created'));
    setOpen(false);
    router.refresh();
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('Nuovo redirect', 'New redirect')}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Nuovo redirect', 'New redirect')}</DialogTitle>
            <DialogDescription>{t('Reindirizza un vecchio path verso uno nuovo', 'Redirect an old path to a new one')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>{t('Da (path)', 'From (path)')}</Label><Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder={t('/vecchio-path', '/old-path')} /></div>
            <div className="space-y-1.5"><Label>{t('A (URL o path)', 'To (URL or path)')}</Label><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder={t('/nuovo-path', '/new-path')} /></div>
            <div className="space-y-1.5">
              <Label>{t('Tipo HTTP', 'HTTP type')}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">{t('301 — Permanente', '301 — Permanent')}</SelectItem>
                  <SelectItem value="302">{t('302 — Temporaneo', '302 — Temporary')}</SelectItem>
                  <SelectItem value="307">{t('307 — Temporaneo (preserva metodo)', '307 — Temporary (preserves method)')}</SelectItem>
                  <SelectItem value="308">{t('308 — Permanente (preserva metodo)', '308 — Permanent (preserves method)')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('Annulla', 'Cancel')}</Button>
            <Button onClick={create} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Crea', 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
