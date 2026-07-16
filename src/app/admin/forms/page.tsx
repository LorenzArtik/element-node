import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit3, Inbox, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CreateFormButton } from './create-button';
import { DeleteFormButton } from './delete-button';

export const dynamic = 'force-dynamic';

export default async function FormsPage() {
  const forms = await prisma.form.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Form</h1>
          <p className="text-muted-foreground">{forms.length} form configurati</p>
        </div>
        <CreateFormButton />
      </div>

      {forms.length === 0 ? (
        <Card className="p-16 text-center">
          <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Nessun form. Creane uno per gestire contatti, newsletter, lead generation.</p>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            <div className="grid grid-cols-[1fr_120px_120px_180px_140px] gap-4 px-6 py-3 text-xs font-medium uppercase text-muted-foreground bg-muted/40">
              <div>Nome</div>
              <div>Stato</div>
              <div>Submission</div>
              <div>Aggiornato</div>
              <div className="text-right">Azioni</div>
            </div>
            {forms.map((f) => (
              <div key={f.id} className="grid grid-cols-[1fr_120px_120px_180px_140px] gap-4 items-center px-6 py-4 hover:bg-muted/40">
                <div>
                  <div className="font-medium">{f.name}</div>
                  {f.description && <div className="text-xs text-muted-foreground truncate">{f.description}</div>}
                </div>
                <Badge variant={f.status === 'ACTIVE' ? 'success' : 'outline'}>{f.status}</Badge>
                <div className="text-sm">
                  <Link href={`/admin/forms/${f.id}/submissions`} className="hover:underline">{f._count.submissions}</Link>
                </div>
                <div className="text-sm text-muted-foreground">{formatDate(f.updatedAt)}</div>
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="icon" title="Submission">
                    <Link href={`/admin/forms/${f.id}/submissions`}><Inbox className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" title="Modifica">
                    <Link href={`/admin/forms/${f.id}`}><Edit3 className="h-4 w-4" /></Link>
                  </Button>
                  <DeleteFormButton id={f.id} name={f.name} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
