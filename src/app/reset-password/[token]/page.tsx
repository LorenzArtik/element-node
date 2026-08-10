'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { t } from '@/lib/admin-i18n';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const isInvite = params.get('invite') === '1';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error(t('Le password non corrispondono', 'Passwords do not match')); return; }
    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password, type: isInvite ? 'INVITE' : 'RESET' }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(t('Errore', 'Error'), { description: err?.error?.message });
      return;
    }
    toast.success(isInvite ? t('Password creata, ora puoi accedere.', 'Password created — you can now sign in.') : t('Password aggiornata.', 'Password updated.'));
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{isInvite ? t('Crea la tua password', 'Create your password') : t('Reimposta password', 'Reset password')}</h1>
          <p className="text-muted-foreground mt-1">
            {isInvite ? t('Imposta una password per il tuo nuovo account.', 'Set a password for your new account.') : t('Scegli una nuova password.', 'Choose a new password.')}
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nuova password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="space-y-2">
            <Label>Conferma</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
          </div>
          <Button type="submit" className="w-full" disabled={loading} size="lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Salva password', 'Save password')}
          </Button>
        </form>
        <div className="text-sm text-center text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">← Login</Link>
        </div>
      </div>
    </div>
  );
}
