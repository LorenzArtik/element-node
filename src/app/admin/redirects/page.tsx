import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { can } from '@/lib/permissions';
import { CreateRedirectButton } from './create-button';
import { DeleteRedirectButton } from './delete-button';

export const dynamic = 'force-dynamic';

export default async function RedirectsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!can(session.user.role, 'redirect.write')) redirect('/admin');

  const redirects = await prisma.redirect.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Redirect</h1>
          <p className="text-muted-foreground">{redirects.length} regole configurate</p>
        </div>
        <CreateRedirectButton />
      </div>

      <Card>
        <div className="divide-y">
          <div className="grid grid-cols-[2fr_2fr_auto_auto_auto_auto] gap-4 px-6 py-3 text-xs font-medium uppercase text-muted-foreground bg-muted/40">
            <div>Da</div>
            <div>A</div>
            <div>Tipo</div>
            <div>Hit</div>
            <div>Stato</div>
            <div className="text-right">Azioni</div>
          </div>
          {redirects.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Nessun redirect configurato.</div>
          ) : (
            redirects.map((r) => (
              <div key={r.id} className="grid grid-cols-[2fr_2fr_auto_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-muted/40">
                <div className="font-mono text-sm truncate">{r.fromPath}</div>
                <div className="flex items-center gap-2 font-mono text-sm truncate">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  {r.toPath}
                </div>
                <Badge variant="outline">{r.type}</Badge>
                <div className="text-sm text-muted-foreground">{r.hits}</div>
                <Badge variant={r.enabled ? 'success' : 'outline'}>{r.enabled ? 'Attivo' : 'Disattivo'}</Badge>
                <div className="flex justify-end">
                  <DeleteRedirectButton id={r.id} fromPath={r.fromPath} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
