import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit3, UserCog, ShieldOff, MailCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { ROLE_LABELS, can } from '@/lib/permissions';
import { CreateUserButton } from './create-button';
import { DeleteUserButton } from './delete-button';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!can(session.user.role, 'user.read')) redirect('/admin');

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, avatarUrl: true, locked: true, verifiedAt: true, lastLoginAt: true, createdAt: true },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utenti</h1>
          <p className="text-muted-foreground">{users.length} utenti totali</p>
        </div>
        <CreateUserButton />
      </div>

      <Card>
        <div className="divide-y">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 text-xs font-medium uppercase text-muted-foreground bg-muted/40">
            <div>Utente</div>
            <div>Ruolo</div>
            <div>Stato</div>
            <div>Ultimo accesso</div>
            <div className="text-right">Azioni</div>
          </div>
          {users.map((u) => (
            <div key={u.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-muted/40">
              <div className="flex items-center gap-3 min-w-0">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-xs font-bold">
                    {(u.name ?? u.email).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{u.name ?? u.email.split('@')[0]}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
              </div>
              <Badge variant={u.role === 'ADMIN' ? 'default' : 'outline'}>{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}</Badge>
              <div className="flex gap-1.5 flex-wrap">
                {u.locked ? (
                  <Badge variant="destructive">Bloccato</Badge>
                ) : u.lastLoginAt ? (
                  <Badge variant="success">Attivo</Badge>
                ) : u.verifiedAt ? (
                  <Badge variant="outline">Verificato</Badge>
                ) : (
                  <Badge variant="outline">In attesa</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}
              </div>
              <div className="flex justify-end gap-1">
                <Button asChild variant="ghost" size="icon" title="Modifica">
                  <Link href={`/admin/users/${u.id}`}><Edit3 className="h-4 w-4" /></Link>
                </Button>
                {u.id !== session.user.id && <DeleteUserButton id={u.id} email={u.email} />}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
