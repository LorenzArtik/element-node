'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle, Trash2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SubmissionRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  async function update(newStatus: string) {
    const res = await fetch(`/api/forms/submissions/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { toast.success('Aggiornato'); router.refresh(); }
    else toast.error('Errore');
  }
  async function del() {
    const res = await fetch(`/api/forms/submissions/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Eliminata'); router.refresh(); }
    else toast.error('Errore');
  }
  return (
    <div className="flex justify-end gap-1">
      {status === 'NEW' && (
        <Button variant="ghost" size="icon" title="Segna come letto" onClick={() => update('READ')} className="h-7 w-7"><CheckCircle className="h-3.5 w-3.5" /></Button>
      )}
      {status !== 'SPAM' && (
        <Button variant="ghost" size="icon" title="Spam" onClick={() => update('SPAM')} className="h-7 w-7"><Ban className="h-3.5 w-3.5 text-orange-500" /></Button>
      )}
      <Button variant="ghost" size="icon" title="Elimina" onClick={del} className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
    </div>
  );
}
