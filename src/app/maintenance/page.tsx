import { getSiteSettings } from '@/lib/site-settings';
import { Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  const s = await getSiteSettings();
  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div className="max-w-md space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--en-color-primary,#92003b)] text-white flex items-center justify-center">
          <Wrench className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold">{s.name}</h1>
        <p className="text-[var(--en-color-text-muted,#64748b)] whitespace-pre-line">
          {s.maintenanceMessage || 'Stiamo facendo manutenzione. Torneremo presto.'}
        </p>
      </div>
    </div>
  );
}
