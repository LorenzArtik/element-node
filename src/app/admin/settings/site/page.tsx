import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSiteSettings } from '@/lib/site-settings';
import { SiteSettingsForm } from './form';
import { t } from '@/lib/admin-i18n';

export const dynamic = 'force-dynamic';

export default async function SiteSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect('/login');
  const settings = await getSiteSettings();
  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('Impostazioni sito', 'Site settings')}</h1>
        <p className="text-muted-foreground">{t('Brand, colori, tipografia e configurazione globale', 'Brand, colors, typography and global configuration')}</p>
      </div>
      <SiteSettingsForm initial={settings} defaultTab={tab} />
    </div>
  );
}
