import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSiteSettings } from '@/lib/site-settings';
import { SiteSettingsForm } from './form';

export const dynamic = 'force-dynamic';

export default async function SiteSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const settings = await getSiteSettings();
  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni sito</h1>
        <p className="text-muted-foreground">Brand, colori, tipografia e configurazione globale</p>
      </div>
      <SiteSettingsForm initial={settings} />
    </div>
  );
}
