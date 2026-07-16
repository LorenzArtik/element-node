import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserEditForm } from '../users/[id]/form';
import { ROLE_LABELS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect('/login');
  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Il mio profilo</h1>
        <p className="text-muted-foreground">{ROLE_LABELS[user.role]}</p>
      </div>
      <UserEditForm
        id={user.id}
        canChangeRole={false}
        initial={{
          email: user.email,
          name: user.name ?? '',
          role: user.role,
          bio: user.bio ?? '',
          slug: user.slug ?? '',
          avatarUrl: user.avatarUrl ?? '',
          socials: (user.socials as Record<string, string>) ?? {},
          locked: user.locked,
        }}
      />
    </div>
  );
}
