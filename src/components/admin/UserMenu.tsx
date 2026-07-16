'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { ChevronRight, User, LogOut, Sun, Moon, Monitor, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu({
  name,
  email,
  role,
  avatarUrl,
}: {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const initials = (name || email).slice(0, 2).toUpperCase();

  const themeOpts = [
    { value: 'light', icon: Sun, label: 'Tema chiaro' },
    { value: 'dark', icon: Moon, label: 'Tema scuro' },
    { value: 'system', icon: Monitor, label: 'Tema sistema' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-full flex items-center gap-2.5 p-2 rounded-lg border bg-card hover:bg-accent transition-colors group focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Apri menu utente"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-[#92003b] to-[#a4286a] text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1 text-left">
            <div className="text-sm font-medium truncate leading-tight">{name || email.split('@')[0]}</div>
            <div className="text-[10px] text-muted-foreground truncate">{role}</div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-data-[state=open]:rotate-90 transition-transform" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-60">
        <div className="px-3 py-2 border-b">
          <div className="text-sm font-semibold truncate">{name || email.split('@')[0]}</div>
          <div className="text-xs text-muted-foreground truncate">{email}</div>
        </div>

        <DropdownMenuItem asChild>
          <Link href="/admin/profile">
            <User className="h-4 w-4" />
            Il mio profilo
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a href="/" target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Visualizza sito
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Aspetto</DropdownMenuLabel>

        {mounted && themeOpts.map((opt) => {
          const Icon = opt.icon;
          const active = (theme ?? 'system') === opt.value;
          return (
            <DropdownMenuItem
              key={opt.value}
              onSelect={(e) => { e.preventDefault(); setTheme(opt.value); }}
              className={active ? 'bg-accent/50' : ''}
            >
              <Icon className="h-4 w-4" />
              {opt.label}
              {active && <span className="ml-auto text-[10px] text-muted-foreground">attivo</span>}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          destructive
          onSelect={(e) => {
            e.preventDefault();
            signOut({ callbackUrl: '/login' });
          }}
        >
          <LogOut className="h-4 w-4" />
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
