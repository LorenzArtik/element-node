export async function register() {
  // Solo nel processo server Node (non edge, non durante la build).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  // Rivalidazione licenza indipendente dal traffico: le pagine pubbliche
  // vivono nella full route cache, quindi getLicenseInfo() può non girare
  // per settimane su siti senza modifiche (lastValidatedAt fermo lato
  // portale, revoche/scadenze mai recepite). Ping all'avvio + ogni 6h;
  // la cache 12h interna evita chiamate ridondanti al portale.
  const { getLicenseInfo } = await import('./lib/license-client');
  const run = () => {
    getLicenseInfo().catch(() => {
      // best-effort: fail-open come il resto del client licenze
    });
  };
  const initial = setTimeout(run, 30_000);
  initial.unref?.();
  const interval = setInterval(run, 6 * 60 * 60 * 1000);
  interval.unref?.();
}
