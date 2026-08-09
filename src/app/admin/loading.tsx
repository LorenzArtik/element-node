import { Loader2 } from 'lucide-react';
import { t } from '@/lib/admin-i18n';

export default function AdminLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {t('Caricamento…', 'Loading…')}
      </div>
    </div>
  );
}
