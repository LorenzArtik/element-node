import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Database, Lock, Zap, Palette, ChevronRight, Key } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const userCount = await prisma.user.count();
  const aiOk = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni Sistema</h1>
        <p className="text-muted-foreground">Stato, sicurezza, configurazione tecnica</p>
      </div>

      {/* Sub-pages */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/settings/site">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4" /> Site Settings</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Brand, colori, font, integrazioni API, scripts</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/settings/performance">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-amber-500" /> Cache & Performance</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Cache LRU, immagini, headers HTTP, bundle splitting</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/api-keys">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base"><Key className="h-4 w-4 text-amber-500" /> API Keys</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Token per accesso programmatico (Claude Code, script, automazioni)</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Status cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" /> Database</CardTitle>
            <Badge variant="success">Connesso</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{userCount} utenti registrati</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> AI Anthropic</CardTitle>
            <Badge variant={aiOk ? 'success' : 'destructive'}>{aiOk ? 'Attiva' : 'Non configurata'}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {aiOk ? `Modello: ${process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'}` : 'Aggiungi ANTHROPIC_API_KEY al file .env o in Site Settings → API'}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4" /> Sicurezza</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Auth Provider: <code className="text-foreground">credentials</code> (NextAuth v5)</div>
            <div>Session strategy: <code className="text-foreground">jwt</code></div>
            <div>Trust host: <code className="text-foreground">{process.env.AUTH_TRUST_HOST || 'true'}</code></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
