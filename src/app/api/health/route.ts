import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CheckResult { ok: boolean; ms: number; error?: string; meta?: Record<string, unknown> }

export async function GET() {
  const start = Date.now();
  const checks: Record<string, CheckResult> = {};

  // DB ping + count tabelle principali
  const dbStart = Date.now();
  try {
    const [pages, posts, users, forms, media] = await Promise.all([
      prisma.page.count(),
      prisma.post.count(),
      prisma.user.count(),
      prisma.form.count(),
      prisma.media.count(),
    ]);
    checks.db = { ok: true, ms: Date.now() - dbStart, meta: { pages, posts, users, forms, media } };
  } catch (e) {
    checks.db = { ok: false, ms: Date.now() - dbStart, error: (e as Error).message };
  }

  // Anthropic key (env o settings)
  let aiKeyPresent = !!process.env.ANTHROPIC_API_KEY;
  if (!aiKeyPresent) {
    try {
      const { getSiteSettings } = await import('@/lib/site-settings');
      const s = await getSiteSettings();
      aiKeyPresent = !!s.integrations.anthropicApiKey;
    } catch {}
  }
  checks.ai = { ok: aiKeyPresent, ms: 0 };

  // Memory (soglia 1500MB: dev mode + turbopack ne usano molta)
  const mem = process.memoryUsage();
  checks.memory = {
    ok: mem.heapUsed < 1500 * 1024 * 1024,
    ms: 0,
    meta: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    },
  };

  // Email — usa il provider unificato (console/smtp/brevo)
  try {
    const { probeEmailProvider } = await import('@/lib/email');
    const probe = await probeEmailProvider();
    checks.email = {
      ok: probe.configured,
      ms: 0,
      meta: { mode: probe.provider, details: probe.details ?? '' },
    };
  } catch (e) {
    checks.email = { ok: false, ms: 0, error: (e as Error).message };
  }

  const ok = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({
    ok,
    version: process.env.npm_package_version || 'dev',
    uptime: Math.floor(process.uptime()),
    nodeVersion: process.version,
    ms: Date.now() - start,
    checks,
  }, { status: ok ? 200 : 503 });
}
