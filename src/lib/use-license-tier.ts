'use client';

import { useEffect, useState } from 'react';
import type { LicenseTier } from './license-features';

// Cache a livello di modulo: una sola fetch per sessione editor.
let cached: LicenseTier | null = null;
let inflight: Promise<LicenseTier> | null = null;

/** Tier licenza corrente lato client (editor). Fail-open su 'full'. */
export function useLicenseTier(): LicenseTier {
  const [tier, setTier] = useState<LicenseTier>(cached ?? 'full');

  useEffect(() => {
    if (cached) return;
    inflight ??= fetch('/api/admin/license-tier')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        cached = (j?.tier as LicenseTier) ?? 'full';
        return cached;
      })
      .catch(() => 'full' as LicenseTier);
    let alive = true;
    inflight.then((t) => {
      if (alive) setTier(t);
    });
    return () => {
      alive = false;
    };
  }, []);

  return tier;
}
