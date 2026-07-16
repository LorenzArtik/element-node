import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { can, ROLE_LABELS } from '@/lib/permissions';
import { UserEditForm } from './form';

export const dynamic = 'force-dynamic';

export default async function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const isSelf = id === session.user.id;
  if (!isSelf && !can(session.user.role, 'user.write')) redirect('/admin');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();
  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{user.name ?? user.email}</h1>
        <p className="text-muted-foreground">{ROLE_LABELS[user.role]} · {user.email}</p>
      </div>
      <UserEditForm
        id={user.id}
        canChangeRole={!isSelf && can(session.user.role, 'user.write')}
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
