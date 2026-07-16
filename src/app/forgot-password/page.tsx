'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
    setLoading(false);
    setSent(true);
    toast.success('Se l\'email esiste, riceverai il link a breve.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Password dimenticata?</h1>
          <p className="text-muted-foreground mt-1">Inserisci la tua email per ricevere il link di reset.</p>
        </div>
        {sent ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">
            Se l&apos;indirizzo è registrato, abbiamo inviato un link di reset. Controlla la posta (anche lo spam).
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invia link'}
            </Button>
          </form>
        )}
        <div className="text-sm text-center text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">← Torna al login</Link>
        </div>
      </div>
    </div>
  );
}
