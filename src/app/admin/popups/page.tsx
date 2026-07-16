import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Edit3, Settings2, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CreatePopupButton } from './create-button';
import { DeletePopupButton } from './delete-button';

export const dynamic = 'force-dynamic';

export default async function PopupsPage() {
  const popups = await prisma.popup.findMany({ orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }] });
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Popup</h1>
          <p className="text-muted-foreground">Crea popup con trigger e regole di visualizzazione</p>
        </div>
        <CreatePopupButton />
      </div>

      {popups.length === 0 ? (
        <Card className="p-16 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Nessun popup. Creane uno per attivare modali, banner newsletter, exit-intent.</p>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 text-xs font-medium uppercase text-muted-foreground bg-muted/40">
              <div>Nome</div>
              <div>Trigger</div>
              <div>Stato</div>
              <div>Aggiornato</div>
              <div className="text-right">Azioni</div>
            </div>
            {popups.map((p) => {
              const t = p.trigger as { type: string };
              return (
                <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-muted/40">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">Priorità {p.priority}</div>
                  </div>
                  <Badge variant="outline">{t.type}</Badge>
                  <Badge variant={p.status === 'PUBLISHED' ? 'success' : 'outline'}>{p.status}</Badge>
                  <div className="text-sm text-muted-foreground">{formatDate(p.updatedAt)}</div>
                  <div className="flex gap-1">
                    <Button asChild variant="ghost" size="icon" title="Impostazioni">
                      <Link href={`/admin/popups/${p.id}/settings`}><Settings2 className="h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon" title="Editor">
                      <Link href={`/editor/popup/${p.id}`}><Edit3 className="h-4 w-4" /></Link>
                    </Button>
                    <DeletePopupButton id={p.id} name={p.name} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
