import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Edit3 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { SubmissionRowActions } from './row-actions';

export const dynamic = 'force-dynamic';

export default async function SubmissionsPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const sp = await searchParams;
  const form = await prisma.form.findUnique({ where: { id } });
  if (!form) notFound();

  const where: Record<string, unknown> = { formId: id };
  if (sp.status) where.status = sp.status;
  const subs = await prisma.formSubmission.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });

  const counts = await prisma.formSubmission.groupBy({ by: ['status'], where: { formId: id }, _count: true });
  const total = counts.reduce((acc, c) => acc + c._count, 0);

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/admin/forms/${id}`}><ArrowLeft className="h-4 w-4" /> {form.name}</Link>
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submission</h1>
          <p className="text-muted-foreground">{total} totali · {subs.length} mostrate</p>
        </div>
        <Button asChild variant="outline">
          <a href={`/api/forms/${id}/submissions?format=csv`}><Download className="h-4 w-4" /> Esporta CSV</a>
        </Button>
      </div>

      <div className="flex gap-1 border-b">
        {['', 'NEW', 'READ', 'SPAM', 'TRASH'].map((s) => (
          <Link
            key={s}
            href={`/admin/forms/${id}/submissions${s ? `?status=${s}` : ''}`}
            className={`px-4 py-2 text-sm transition-colors ${(sp.status ?? '') === s ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {s || 'Tutte'}
          </Link>
        ))}
      </div>

      <Card>
        <div className="divide-y">
          <div className="grid grid-cols-[140px_1fr_120px_120px_140px] gap-4 px-6 py-3 text-xs font-medium uppercase text-muted-foreground bg-muted/40">
            <div>Data</div>
            <div>Dati</div>
            <div>IP</div>
            <div>Stato</div>
            <div className="text-right">Azioni</div>
          </div>
          {subs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Nessuna submission.</div>
          ) : (
            subs.map((s) => {
              const data = s.data as Record<string, unknown>;
              const preview = Object.entries(data)
                .filter(([k]) => k !== 'honeypot' && !k.startsWith('_'))
                .slice(0, 3)
                .map(([k, v]) => `${k}: ${String(v ?? '').slice(0, 40)}`)
                .join(' · ');
              return (
                <div key={s.id} className="grid grid-cols-[140px_1fr_120px_120px_140px] gap-4 items-center px-6 py-4 hover:bg-muted/40">
                  <div className="text-xs">{formatDate(s.createdAt)}</div>
                  <div className="text-sm truncate" title={JSON.stringify(data)}>{preview}</div>
                  <div className="text-xs font-mono text-muted-foreground">{s.ip}</div>
                  <Badge variant={s.status === 'NEW' ? 'default' : s.status === 'SPAM' ? 'destructive' : 'outline'}>{s.status}</Badge>
                  <SubmissionRowActions id={s.id} status={s.status} />
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
