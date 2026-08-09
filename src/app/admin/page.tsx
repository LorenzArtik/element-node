import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Image as ImageIcon, Newspaper, Plus, Sparkles, TrendingUp, Activity, Users, Inbox, MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { t } from '@/lib/admin-i18n';
import { HealthWidget } from './health-widget';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [pageCount, postCount, mediaCount, userCount, formCount, popupCount, recentPages] = await Promise.all([
    prisma.page.count(),
    prisma.post.count(),
    prisma.media.count(),
    prisma.user.count(),
    prisma.form.count(),
    prisma.popup.count(),
    prisma.page.findMany({ orderBy: { updatedAt: 'desc' }, take: 5, include: { author: true } }),
  ]);

  const stats = [
    { label: t('Pagine', 'Pages'), value: pageCount, icon: FileText, color: 'from-blue-500 to-cyan-500' },
    { label: t('Articoli', 'Posts'), value: postCount, icon: Newspaper, color: 'from-violet-500 to-fuchsia-500' },
    { label: 'Media', value: mediaCount, icon: ImageIcon, color: 'from-emerald-500 to-teal-500' },
    { label: t('Utenti', 'Users'), value: userCount, icon: Users, color: 'from-orange-500 to-amber-500' },
    { label: t('Form', 'Forms'), value: formCount, icon: Inbox, color: 'from-pink-500 to-rose-500' },
    { label: t('Popup', 'Popups'), value: popupCount, icon: MessageSquare, color: 'from-indigo-500 to-purple-500' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">{t('Panoramica del tuo sito', 'Overview of your site')}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/admin/pages/new"><Plus className="h-4 w-4" /> {t('Nuova pagina', 'New page')}</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent><div className="text-3xl font-bold">{s.value}</div></CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('Ultime modifiche', 'Recent changes')}</CardTitle>
            <CardDescription>{t('Le 5 pagine modificate più di recente', 'The 5 most recently edited pages')}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>{t('Nessuna pagina ancora.', 'No pages yet.')}</p>
                <Button asChild className="mt-4"><Link href="/admin/pages/new">{t('Crea la prima', 'Create the first one')}</Link></Button>
              </div>
            ) : (
              <div className="space-y-1">
                {recentPages.map((p) => (
                  <Link key={p.id} href={`/editor/${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {p.title}
                        {p.isHomepage && <Badge variant="secondary">Home</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">/{p.slug} · {formatDate(p.updatedAt)} · {p.author.name}</div>
                    </div>
                    <Badge variant={p.status === 'PUBLISHED' ? 'success' : 'outline'}>{p.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <HealthWidget />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Assistant</CardTitle>
              <CardDescription>{t('Genera contenuti via prompt', 'Generate content via prompt')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{t('Nel pannello editor, clicca', 'In the editor panel, click')} <b>AI</b> {t('per generare sezioni, scrivere copy, tradurre.', 'to generate sections, write copy, translate.')}</p>
              <div className="flex items-center gap-2 text-xs pt-2 border-t">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                Powered by Claude (Anthropic)
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
