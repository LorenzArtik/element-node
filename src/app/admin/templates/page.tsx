import { prisma } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const items = await prisma.template.findMany({ orderBy: { updatedAt: 'desc' } });
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Template</h1>
        <p className="text-muted-foreground">Sezioni e pagine riutilizzabili</p>
      </div>
      {items.length === 0 ? (
        <Card className="p-16 text-center">
          <Layers className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Nessun template ancora. Salvane uno dall'editor cliccando su "Salva come template".</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-muted-foreground">{t.type} · {formatDate(t.updatedAt)}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
