'use client';

import { useEffect, useRef } from 'react';

/**
 * ContentEditable component per edit inline.
 * - Inizia in modalità non editabile
 * - Doppio click → editabile (focus + select all)
 * - Blur → salva
 * - Esc → cancel
 *
 * Usa direttamente innerText/innerHTML: per testi semplici (h1-h6, button label)
 * o per html (text editor) la prop `multiline` controlla se accettare invio.
 */
interface Props {
  value: string;
  onChange: (next: string) => void;
  tag?: keyof React.JSX.IntrinsicElements;
  multiline?: boolean;
  /** Se true, value contiene HTML; altrimenti plain text */
  html?: boolean;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
  /** Click handler esterno (es. select element) */
  onClick?: (e: React.MouseEvent) => void;
}

export function InlineEditable({
  value, onChange, tag: Tag = 'div', multiline = false, html = false,
  style, className, placeholder, onClick,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);

  // Sync esterno → DOM quando il value cambia (e non sto editando)
  useEffect(() => {
    const el = ref.current;
    if (!el || el === document.activeElement) return;
    if (html) {
      if (el.innerHTML !== value) el.innerHTML = value || '';
    } else {
      if (el.textContent !== value) el.textContent = value || '';
    }
  }, [value, html]);

  function handleBlur() {
    const el = ref.current;
    if (!el) return;
    const next = html ? el.innerHTML : (el.textContent ?? '');
    if (next !== value) onChange(next);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  }

  function handleDoubleClick(e: React.MouseEvent) {
    // Seleziona tutto il contenuto al doppio-click
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.contentEditable = 'true';
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  function handleFocus(e: React.FocusEvent) {
    const el = e.currentTarget as HTMLElement;
    el.contentEditable = 'true';
  }

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      suppressContentEditableWarning
      style={{
        outline: 'none',
        cursor: 'text',
        minHeight: '1em',
        ...style,
      }}
      className={className}
      data-en-inline-editable
      data-placeholder={placeholder}
    />
  );
}

/** Marker per detect editor mode in render.tsx */
export function useIsEditorMode(): boolean {
  if (typeof window === 'undefined') return false;
  return /\/(editor|admin)\//.test(window.location.pathname);
}
