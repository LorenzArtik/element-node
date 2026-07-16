import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { conditionsSchema } from '@/lib/theme-blocks';
import { ThemeBlockSettingsForm } from './form';

export const dynamic = 'force-dynamic';

export default async function ThemeBlockSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const row = await prisma.themeBlock.findUnique({ where: { id } });
  if (!row) notFound();
  const conditions = conditionsSchema.parse(row.conditions);
  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni: {row.name}</h1>
        <p className="text-muted-foreground">{row.kind} · Priorità {row.priority} · {row.status}</p>
      </div>
      <ThemeBlockSettingsForm
        id={row.id}
        initial={{
          name: row.name,
          priority: row.priority,
          status: row.status,
          conditions,
        }}
      />
    </div>
  );
}
