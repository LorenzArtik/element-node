import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getLicenseInfo } from '@/lib/license-client';
import { tierForPlan } from '@/lib/license-features';
import { t } from '@/lib/admin-i18n';
import { LicenseManager } from './LicenseManager';

export const dynamic = 'force-dynamic';

export default async function LicensePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!can(session.user.role, 'site.settings.read')) redirect('/admin');

  const info = await getLicenseInfo().catch(() => ({
    key: '', valid: false, plan: '', reason: '', checkedAt: '', currentPeriodEnd: null,
  }));
  const initial = { ...info, tier: tierForPlan(info.plan, info.valid) };

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('Licenza', 'License')}</h1>
        <p className="text-muted-foreground">
          {t('Attiva la tua licenza e sblocca tutte le funzioni. Element Node resta open source e self-hosted.',
            'Activate your license and unlock every feature. Element Node stays open source and self-hosted.')}
        </p>
      </div>
      <LicenseManager initial={initial} />
    </div>
  );
}
