'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import { executeRecaptcha } from '@/lib/recaptcha-client';
import { t } from '@/lib/admin-i18n';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') ?? '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha('login');
      const res = await signIn('credentials', { email, password, recaptchaToken, redirect: false });
      if (res?.error || !res?.ok) {
        toast.error(t('Credenziali non valide', 'Invalid credentials'));
        setLoading(false);
        return;
      }
      toast.success(t('Benvenuto!', 'Welcome!'));
      // Hard redirect: evita ClientFetchError causato da getSession dopo signIn
      window.location.href = from;
    } catch (err) {
      toast.error(t('Errore login', 'Login error'), { description: (err as Error).message });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Accedi', 'Sign in')}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white p-12 flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
            aria-hidden
          >
            <rect x="2" y="2" width="36" height="36" rx="10" fill="rgba(255,255,255,0.16)" />
            <path
              d="M13 13h14M13 20h10M13 27h14"
              stroke="white"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="29" cy="20" r="2" fill="white" />
          </svg>
          <div className="leading-none">
            <div className="text-xl font-bold tracking-tight">Element Node</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">
              CMS Visual
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <h1 className="text-5xl font-bold leading-tight">
            {t('Costruisci pagine come un', 'Build pages like a')}<br />{t('designer professionista.', 'professional designer.')}
          </h1>
          <p className="text-lg opacity-90 max-w-md">
            {t('Drag & drop, widget pro, AI integrata per generare contenuti con un prompt. Sul tuo server in 5 minuti.', 'Drag & drop, pro widgets, built-in AI that generates content from a prompt. On your own server in 5 minutes.')}
          </p>
        </div>
        <div className="text-sm opacity-70">© Element Node — {t('tutti i diritti riservati', 'all rights reserved')}</div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-3xl font-bold">{t('Accedi', 'Sign in')}</h2>
            <p className="text-muted-foreground mt-1">{t('Usa le credenziali admin per entrare nel CMS', 'Use your admin credentials to enter the CMS')}</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
          <div className="text-sm text-center space-y-1">
            <a href="/forgot-password" className="text-primary hover:underline">{t('Password dimenticata?', 'Forgot password?')}</a>
          </div>
          {process.env.NEXT_PUBLIC_LOGIN_HINT && (
            <p className="text-xs text-muted-foreground text-center">{process.env.NEXT_PUBLIC_LOGIN_HINT}</p>
          )}
        </div>
      </div>
    </div>
  );
}
