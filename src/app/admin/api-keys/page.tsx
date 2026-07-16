import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CreateApiKeyButton } from './create-button';
import { RevokeApiKeyButton } from './revoke-button';

export const dynamic = 'force-dynamic';

export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/admin');
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { email: true, name: true } } },
  });

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Key className="h-7 w-7 text-amber-500" />
            API Keys
          </h1>
          <p className="text-muted-foreground">Token per accesso programmatico al CMS (es. da Claude Code, script, automazioni)</p>
        </div>
        <CreateApiKeyButton />
      </div>

      <Card>
        <div className="divide-y">
          <div className="grid grid-cols-[1fr_180px_140px_180px_auto] gap-4 px-6 py-3 text-xs font-medium uppercase text-muted-foreground bg-muted/40">
            <div>Nome / Token</div>
            <div>Scopes</div>
            <div>Stato</div>
            <div>Ultimo uso</div>
            <div className="text-right">Azioni</div>
          </div>
          {keys.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Key className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nessuna API key ancora.</p>
              <p className="text-xs mt-1">Crea la prima per usare il CMS programmaticamente.</p>
            </div>
          ) : (
            keys.map((k) => {
              const scopes = (k.scopes as string[]) ?? [];
              const status = k.revokedAt ? 'revoked' : (k.expiresAt && k.expiresAt < new Date()) ? 'expired' : 'active';
              return (
                <div key={k.id} className="grid grid-cols-[1fr_180px_140px_180px_auto] gap-4 items-center px-6 py-4 hover:bg-muted/40">
                  <div>
                    <div className="font-medium">{k.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{k.prefix}…{k.tail}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Creata {formatDate(k.createdAt)} · {k.createdBy?.name ?? k.createdBy?.email ?? 'sistema'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {scopes.slice(0, 3).map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                    ))}
                    {scopes.length > 3 && <Badge variant="outline" className="text-[10px]">+{scopes.length - 3}</Badge>}
                  </div>
                  <div>
                    <Badge variant={status === 'active' ? 'success' : status === 'expired' ? 'outline' : 'destructive'}>
                      {status === 'active' ? 'Attiva' : status === 'expired' ? 'Scaduta' : 'Revocata'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {k.lastUsedAt ? formatDate(k.lastUsedAt) : 'mai usata'}
                  </div>
                  <div className="flex justify-end">
                    {!k.revokedAt && <RevokeApiKeyButton id={k.id} name={k.name} />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
