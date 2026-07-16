'use client';

import { ThemeProvider as NextThemes } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // Salva preferenza in localStorage con questa chiave
      storageKey="en-admin-theme"
    >
      {children}
    </NextThemes>
  );
}
