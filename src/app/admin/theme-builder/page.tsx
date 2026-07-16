import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, PanelTop, PanelBottom, Edit3, Trash2, Settings2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CreateBlockButton } from './create-button';
import { DeleteBlockButton } from './delete-button';

export const dynamic = 'force-dynamic';

export default async function ThemeBuilderPage() {
  const blocks = await prisma.themeBlock.findMany({
    orderBy: [{ kind: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
  });

  const headers = blocks.filter((b) => b.kind === 'HEADER');
  const footers = blocks.filter((b) => b.kind === 'FOOTER');

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Theme Builder</h1>
        <p className="text-muted-foreground">Crea header e footer globali con regole di applicazione</p>
      </div>

      <BlockGroup
        title="Header"
        kind="HEADER"
        icon={PanelTop}
        blocks={headers}
        emptyHint="Crea un header per definire la barra superiore di navigazione."
      />

      <BlockGroup
        title="Footer"
        kind="FOOTER"
        icon={PanelBottom}
        blocks={footers}
        emptyHint="Crea un footer per definire l'area inferiore del sito."
      />
    </div>
  );
}

function BlockGroup({
  title, kind, icon: Icon, blocks, emptyHint,
}: {
  title: string;
  kind: 'HEADER' | 'FOOTER';
  icon: React.ComponentType<{ className?: string }>;
  blocks: { id: string; name: string; status: string; priority: number; updatedAt: Date }[];
  emptyHint: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
          <span className="text-xs font-normal text-muted-foreground">({blocks.length})</span>
        </h2>
        <CreateBlockButton kind={kind} />
      </div>
      {blocks.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {blocks.map((b) => (
              <div key={b.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-muted/40 transition-colors">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">Aggiornato {formatDate(b.updatedAt)}</div>
                </div>
                <Badge variant="outline">Priorità {b.priority}</Badge>
                <Badge variant={b.status === 'PUBLISHED' ? 'success' : 'outline'}>{b.status}</Badge>
                <div className="flex gap-1">
                  <Button asChild variant="ghost" size="icon" title="Modifica conditions">
                    <Link href={`/admin/theme-builder/${b.id}/settings`}><Settings2 className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" title="Apri editor">
                    <Link href={`/editor/theme-block/${b.id}`}><Edit3 className="h-4 w-4" /></Link>
                  </Button>
                  <DeleteBlockButton id={b.id} name={b.name} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}
