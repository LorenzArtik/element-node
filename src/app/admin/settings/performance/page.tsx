import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Database, Image as ImageIcon, Globe, Clock, HardDrive, Layers, Ruler, Palette as PaletteIcon, Gauge, Ban } from 'lucide-react';
import { CacheManager } from './cache-manager';

export const dynamic = 'force-dynamic';

export default async function PerformancePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-7 w-7 text-amber-500" />
          Cache & Performance
        </h1>
        <p className="text-muted-foreground">Gestione cache, immagini ottimizzate, headers HTTP</p>
      </div>

      {/* Cache in-memory */}
      <CacheManager />

      {/* HTTP cache headers (info, da next.config.mjs) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4" /> Headers HTTP</CardTitle>
          <CardDescription>Configurati staticamente in <code>next.config.mjs</code>. Modifica il file per cambiarli.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <HeaderRow path="/uploads/*" value="public, max-age=31536000, immutable" note="Cache 1 anno per asset uploaded" />
          <HeaderRow path="/_next/static/*" value="public, max-age=31536000, immutable" note="Bundle JS/CSS Next" />
          <HeaderRow path="/sitemap.xml" value="public, max-age=600, s-maxage=600" note="Cache 10min" />
          <HeaderRow path="/robots.txt" value="public, max-age=3600, s-maxage=3600" note="Cache 1h" />
          <HeaderRow path="/admin/*" value="no-store, no-cache, must-revalidate" note="No cache (dashboard)" />
          <HeaderRow path="/api/*" value="no-store" note="API mai cached" />
        </CardContent>
      </Card>

      {/* Image pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="h-4 w-4" /> Image Pipeline</CardTitle>
          <CardDescription>Ogni upload immagine genera variants webp ottimizzate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Stat Icon={Ruler} label="Variant generate" value="sm 480px · md 800px · lg 1280px · xl 1920px" />
            <Stat Icon={PaletteIcon} label="Formato" value="WebP quality 82" />
            <Stat Icon={Gauge} label="Quality" value="82 (sweet spot)" />
            <Stat Icon={Ban} label="Upscale" value="Disabilitato (no enlargement)" />
          </div>
          <div className="text-xs text-muted-foreground border-t pt-3 mt-2">
            Le immagini originali sono conservate come fallback. Le variants vengono usate via <code>srcset</code> nei widget.
          </div>
        </CardContent>
      </Card>

      {/* Bundle splitting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Layers className="h-4 w-4" /> Bundle splitting</CardTitle>
          <CardDescription>Componenti pesanti caricati on-demand</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <BundleRow component="AIChat" trigger="Click su pulsante AI nell'editor" weight="~80KB" />
          <BundleRow component="SeoPanel" trigger="Click su pulsante SEO nell'editor" weight="~25KB" />
          <BundleRow component="PageSettingsDrawer" trigger="Click su impostazioni pagina" weight="~15KB" />
          <BundleRow component="MediaField" trigger="Click su selector immagine" weight="~12KB" />
        </CardContent>
      </Card>

      {/* SSR cache */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" /> Cache SSR (Server-side)</CardTitle>
          <CardDescription>Query DB cached con TTL e invalidazione su save</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <SsrRow key1="site:settings" ttl="60s" trigger="Save Site Settings" />
          <SsrRow key1="page:<slug>" ttl="60s" trigger="Save pagina" />
          <SsrRow key1="theme-blocks:HEADER" ttl="60s" trigger="Save header/footer" />
          <SsrRow key1="theme-blocks:FOOTER" ttl="60s" trigger="Save header/footer" />
          <SsrRow key1="popups:active" ttl="60s" trigger="Save popup" />
          <SsrRow key1="redirects" ttl="60s" trigger="Save redirect" />
          <SsrRow key1="post-types:list" ttl="60s" trigger="Save CPT" />
        </CardContent>
      </Card>
    </div>
  );
}

function HeaderRow({ path, value, note }: { path: string; value: string; note: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="font-mono text-xs">{path}</div>
      <div className="flex items-center gap-3">
        <code className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{value}</code>
        <span className="text-[10px] text-muted-foreground">{note}</span>
      </div>
    </div>
  );
}

function Stat({ Icon, label, value }: { Icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

function BundleRow({ component, trigger, weight }: { component: string; trigger: string; weight: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <div className="font-medium text-sm">{component}</div>
        <div className="text-xs text-muted-foreground">{trigger}</div>
      </div>
      <Badge variant="outline">{weight}</Badge>
    </div>
  );
}

function SsrRow({ key1, ttl, trigger }: { key1: string; ttl: string; trigger: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <code className="text-xs font-mono">{key1}</code>
      <div className="flex items-center gap-3 text-xs">
        <Badge variant="outline">{ttl}</Badge>
        <span className="text-muted-foreground">{trigger}</span>
      </div>
    </div>
  );
}
