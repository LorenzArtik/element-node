import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { triggerSchema, popupSettingsSchema } from '@/lib/popups';
import { conditionsSchema } from '@/lib/theme-blocks';
import { PopupSettingsForm } from './form';

export const dynamic = 'force-dynamic';

export default async function PopupSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const row = await prisma.popup.findUnique({ where: { id } });
  if (!row) notFound();
  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni: {row.name}</h1>
        <p className="text-muted-foreground">Trigger, regole, layout</p>
      </div>
      <PopupSettingsForm
        id={row.id}
        initial={{
          name: row.name,
          priority: row.priority,
          status: row.status,
          trigger: triggerSchema.parse(row.trigger),
          conditions: conditionsSchema.parse(row.conditions),
          settings: popupSettingsSchema.parse(row.settings),
        }}
      />
    </div>
  );
}
