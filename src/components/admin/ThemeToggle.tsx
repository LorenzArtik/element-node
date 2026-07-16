'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-7 flex" />;

  const opts: { value: string; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Chiaro' },
    { value: 'dark', icon: Moon, label: 'Scuro' },
    { value: 'system', icon: Monitor, label: 'Sistema' },
  ];

  return (
    <div className="flex bg-muted rounded-md p-0.5 gap-0.5">
      {opts.map((o) => {
        const Icon = o.icon;
        const active = (theme ?? 'system') === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setTheme(o.value)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={o.label}
            aria-label={o.label}
          >
            <Icon className="h-3 w-3" />
          </button>
        );
      })}
    </div>
  );
}
