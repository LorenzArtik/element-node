'use client';

import { create } from 'zustand';
import {
  PageContent,
  SectionNode,
  ColumnNode,
  ElementNode,
  WidgetType,
  WIDGETS,
  createSection,
  createColumn,
  createElement,
} from './widgets-schema';

export type SelectedNode =
  | { kind: 'section'; sectionId: string }
  | { kind: 'column'; sectionId: string; columnId: string }
  | { kind: 'element'; sectionId: string; columnId: string; elementId: string }
  | null;

export type Device = 'desktop' | 'tablet' | 'mobile';

interface EditorState {
  pageId: string | null;
  pageTitle: string;
  content: PageContent;
  selected: SelectedNode;
  device: Device;
  isDirty: boolean;
  history: PageContent[];
  future: PageContent[];

  init(pageId: string, title: string, content: PageContent): void;
  setDevice(d: Device): void;
  select(s: SelectedNode): void;
  setDirty(d: boolean): void;
  setTitle(t: string): void;

  addSection(columns?: number, afterSectionId?: string): void;
  addSectionAtIndex(columns: number, toIndex: number): void;
  removeSection(sectionId: string): void;
  duplicateSection(sectionId: string): void;
  moveSection(sectionId: string, dir: 'up' | 'down'): void;
  moveSectionToIndex(sectionId: string, toIndex: number): void;
  updateSectionSettings(sectionId: string, settings: Record<string, unknown>): void;

  updateColumn(sectionId: string, columnId: string, patch: Partial<ColumnNode>): void;
  removeColumn(sectionId: string, columnId: string): void;
  duplicateColumn(sectionId: string, columnId: string): void;
  addColumn(sectionId: string): void;
  copyToClipboard(kind: 'element' | 'column' | 'section', id: { sectionId?: string; columnId?: string; elementId?: string }): void;
  pasteFromClipboard(target: { sectionId?: string; columnId?: string; afterIndex?: number }): void;
  clipboard: { kind: 'element' | 'column' | 'section'; data: unknown } | null;

  // Style clipboard — copia/incolla SOLO le chiavi stilistiche, preservando il content
  styleClipboard: { kind: 'element' | 'column' | 'section'; widgetType?: string; styles: Record<string, unknown> } | null;
  copyStyle(target: { kind: 'element' | 'column' | 'section'; sectionId: string; columnId?: string; elementId?: string }): void;
  pasteStyle(target: { kind: 'element' | 'column' | 'section'; sectionId: string; columnId?: string; elementId?: string }): void;
  resetStyle(target: { kind: 'element' | 'column' | 'section'; sectionId: string; columnId?: string; elementId?: string }): void;

  addElement(sectionId: string, columnId: string, type: WidgetType, atIndex?: number): void;
  removeElement(sectionId: string, columnId: string, elementId: string): void;
  duplicateElement(sectionId: string, columnId: string, elementId: string): void;
  updateElementSettings(sectionId: string, columnId: string, elementId: string, settings: Record<string, unknown>): void;
  moveElement(payload: {
    fromSection: string; fromColumn: string; elementId: string;
    toSection: string; toColumn: string; toIndex: number;
  }): void;

  // Bulk: replace entire content (used by AI)
  replaceContent(c: PageContent): void;
  appendSection(s: SectionNode): void;
  /** Replace section in place (keeps same id and index, swaps settings/columns). */
  replaceSection(sectionId: string, newSection: SectionNode): void;

  undo(): void;
  redo(): void;
}

function snapshot(state: EditorState): PageContent {
  return structuredClone(state.content);
}

/**
 * Deduplica gli id duplicati in content. Se due section/column/element hanno
 * lo stesso id, il secondo riceve un id fresco. Preserva la struttura.
 */
function dedupIds(content: PageContent): PageContent {
  const seen = new Set<string>();
  const fresh = () => `n-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`;
  const fix = (id: string): string => {
    if (!seen.has(id)) { seen.add(id); return id; }
    let n = fresh();
    while (seen.has(n)) n = fresh();
    seen.add(n);
    return n;
  };
  const next = structuredClone(content);
  for (const sec of next.sections) {
    sec.id = fix(sec.id);
    for (const col of sec.columns) {
      col.id = fix(col.id);
      for (const el of col.elements) {
        el.id = fix(el.id);
      }
    }
  }
  return next;
}

function pushHistory(state: EditorState): Partial<EditorState> {
  return { history: [...state.history.slice(-49), snapshot(state)], future: [], isDirty: true };
}

/** Chiavi "content" (NON sono stile). Tutto il resto in settings è considerato stile e viene copiato. */
const CONTENT_KEYS = new Set([
  'text', 'title', 'subtitle', 'html', 'code', 'src', 'image', 'link', 'url', 'target',
  'caption', 'alt', 'from', 'to', 'prefix', 'suffix', 'label', 'dueDate', 'formId',
  'recipient', 'fields', 'items', 'slides', 'images', 'networks', 'icon',
  'ctaText', 'ctaUrl', 'ctaSecondaryText', 'ctaSecondaryUrl',
  'before', 'after', 'animated', 'submitText', 'placeholder', 'buttonText',
  'action', 'successText', 'homeLabel', 'separator', 'period', 'currency', 'price',
  'features', 'avatar', 'author', 'role', 'rating', 'date', 'percent',
  // Identificatori
  'id', 'type',
]);

function extractStyleKeys(settings: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(settings)) {
    if (CONTENT_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Trova un nodo per coordinate (section/column/element). */
function findNode(content: PageContent, target: { kind: string; sectionId: string; columnId?: string; elementId?: string }) {
  const section = content.sections.find((s) => s.id === target.sectionId);
  if (!section) return null;
  if (target.kind === 'section') return { kind: 'section' as const, node: section };
  if (!target.columnId) return null;
  const column = section.columns.find((c) => c.id === target.columnId);
  if (!column) return null;
  if (target.kind === 'column') return { kind: 'column' as const, node: column };
  if (!target.elementId) return null;
  const element = column.elements.find((e) => e.id === target.elementId);
  if (!element) return null;
  return { kind: 'element' as const, node: element };
}

/** Defaults di widget noti per il reset stile. Section/column hanno defaults vuoti. */
function widgetDefaultStyle(widgetType?: string): Record<string, unknown> {
  if (!widgetType) return {};
  const w = WIDGETS[widgetType as WidgetType];
  if (!w) return {};
  return extractStyleKeys(w.defaults as Record<string, unknown>);
}

export const useEditor = create<EditorState>((set, get) => ({
  pageId: null,
  pageTitle: '',
  content: { sections: [] },
  selected: null,
  device: 'desktop',
  isDirty: false,
  history: [],
  future: [],

  init: (pageId, title, content) => set({ pageId, pageTitle: title, content: dedupIds(content), selected: null, history: [], future: [], isDirty: false }),
  setDevice: (device) => set({ device }),
  select: (selected) => set({ selected }),
  setDirty: (isDirty) => set({ isDirty }),
  setTitle: (pageTitle) => set((s) => ({ pageTitle, ...pushHistory(s as EditorState) })),

  addSection: (columns = 1, afterSectionId) =>
    set((state) => {
      const newSection = createSection(columns);
      const next = structuredClone(state.content);
      if (afterSectionId) {
        const idx = next.sections.findIndex((s) => s.id === afterSectionId);
        next.sections.splice(idx + 1, 0, newSection);
      } else {
        next.sections.push(newSection);
      }
      return { content: next, selected: { kind: 'section', sectionId: newSection.id }, ...pushHistory(state as EditorState) };
    }),

  addSectionAtIndex: (columns, toIndex) =>
    set((state) => {
      const newSection = createSection(columns);
      const next = structuredClone(state.content);
      const insertAt = Math.max(0, Math.min(toIndex, next.sections.length));
      next.sections.splice(insertAt, 0, newSection);
      return { content: next, selected: { kind: 'section', sectionId: newSection.id }, ...pushHistory(state as EditorState) };
    }),

  removeSection: (sectionId) =>
    set((state) => {
      const next = structuredClone(state.content);
      next.sections = next.sections.filter((s) => s.id !== sectionId);
      return { content: next, selected: null, ...pushHistory(state as EditorState) };
    }),

  duplicateSection: (sectionId) =>
    set((state) => {
      const next = structuredClone(state.content);
      const idx = next.sections.findIndex((s) => s.id === sectionId);
      if (idx === -1) return {};
      const clone = structuredClone(next.sections[idx]);
      // Re-id deep
      clone.id = `s_${Math.random().toString(36).slice(2, 10)}`;
      clone.columns.forEach((c) => {
        c.id = `c_${Math.random().toString(36).slice(2, 10)}`;
        c.elements.forEach((e) => (e.id = `e_${Math.random().toString(36).slice(2, 10)}`));
      });
      next.sections.splice(idx + 1, 0, clone);
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  moveSection: (sectionId, dir) =>
    set((state) => {
      const next = structuredClone(state.content);
      const idx = next.sections.findIndex((s) => s.id === sectionId);
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (idx === -1 || swap < 0 || swap >= next.sections.length) return {};
      [next.sections[idx], next.sections[swap]] = [next.sections[swap], next.sections[idx]];
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  moveSectionToIndex: (sectionId, toIndex) =>
    set((state) => {
      const next = structuredClone(state.content);
      const idx = next.sections.findIndex((s) => s.id === sectionId);
      if (idx === -1) return {};
      const [moved] = next.sections.splice(idx, 1);
      const target = idx < toIndex ? toIndex - 1 : toIndex;
      const insertAt = Math.max(0, Math.min(target, next.sections.length));
      next.sections.splice(insertAt, 0, moved);
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  updateSectionSettings: (sectionId, settings) =>
    set((state) => {
      const next = structuredClone(state.content);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return {};
      sec.settings = { ...sec.settings, ...settings };
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  clipboard: null,

  copyToClipboard: (kind, id) =>
    set((state) => {
      const sec = state.content.sections.find((s) => s.id === id.sectionId);
      if (!sec) return {};
      if (kind === 'section') return { clipboard: { kind, data: structuredClone(sec) } };
      const col = sec.columns.find((c) => c.id === id.columnId);
      if (!col) return {};
      if (kind === 'column') return { clipboard: { kind, data: structuredClone(col) } };
      const el = col.elements.find((e) => e.id === id.elementId);
      if (!el) return {};
      return { clipboard: { kind, data: structuredClone(el) } };
    }),

  pasteFromClipboard: (target) =>
    set((state) => {
      const cb = state.clipboard;
      if (!cb) return {};
      const next = structuredClone(state.content);
      const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

      if (cb.kind === 'section') {
        const clone = structuredClone(cb.data) as SectionNode;
        clone.id = newId('s');
        clone.columns.forEach((c) => {
          c.id = newId('c');
          c.elements.forEach((e) => (e.id = newId('e')));
        });
        const targetIdx = target.afterIndex ?? next.sections.length;
        next.sections.splice(targetIdx, 0, clone);
      } else if (cb.kind === 'column') {
        const clone = structuredClone(cb.data) as ColumnNode;
        clone.id = newId('c');
        clone.elements.forEach((e) => (e.id = newId('e')));
        const sec = next.sections.find((s) => s.id === target.sectionId);
        if (sec) sec.columns.push(clone);
      } else if (cb.kind === 'element') {
        const clone = structuredClone(cb.data) as ElementNode;
        clone.id = newId('e');
        const col = next.sections.find((s) => s.id === target.sectionId)?.columns.find((c) => c.id === target.columnId);
        if (col) {
          if (typeof target.afterIndex === 'number') col.elements.splice(target.afterIndex + 1, 0, clone);
          else col.elements.push(clone);
        }
      }
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  updateColumn: (sectionId, columnId, patch) =>
    set((state) => {
      const next = structuredClone(state.content);
      const sec = next.sections.find((s) => s.id === sectionId);
      const col = sec?.columns.find((c) => c.id === columnId);
      if (!col) return {};
      Object.assign(col, patch);
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  removeColumn: (sectionId, columnId) =>
    set((state) => {
      const next = structuredClone(state.content);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec || sec.columns.length <= 1) return {}; // non rimuovere ultima colonna
      sec.columns = sec.columns.filter((c) => c.id !== columnId);
      // Ridistribuisci width se le colonne rimanenti non sommano 100
      const total = sec.columns.reduce((s, c) => s + c.width, 0);
      if (total < 99 || total > 101) {
        const w = Math.floor(100 / sec.columns.length);
        sec.columns.forEach((c) => (c.width = w));
      }
      return { content: next, selected: null, ...pushHistory(state as EditorState) };
    }),

  duplicateColumn: (sectionId, columnId) =>
    set((state) => {
      const next = structuredClone(state.content);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return {};
      const idx = sec.columns.findIndex((c) => c.id === columnId);
      if (idx === -1) return {};
      const clone = structuredClone(sec.columns[idx]);
      clone.id = `c_${Math.random().toString(36).slice(2, 10)}`;
      clone.elements.forEach((e) => (e.id = `e_${Math.random().toString(36).slice(2, 10)}`));
      sec.columns.splice(idx + 1, 0, clone);
      // Ridistribuisci width
      const w = Math.floor(100 / sec.columns.length);
      sec.columns.forEach((c) => (c.width = w));
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  addColumn: (sectionId) =>
    set((state) => {
      const next = structuredClone(state.content);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return {};
      const newCol = createColumn(0);
      sec.columns.push(newCol);
      const w = Math.floor(100 / sec.columns.length);
      sec.columns.forEach((c) => (c.width = w));
      return { content: next, selected: { kind: 'column', sectionId, columnId: newCol.id }, ...pushHistory(state as EditorState) };
    }),

  addElement: (sectionId, columnId, type, atIndex) =>
    set((state) => {
      const next = structuredClone(state.content);
      const sec = next.sections.find((s) => s.id === sectionId);
      const col = sec?.columns.find((c) => c.id === columnId);
      if (!col) return {};
      const el = createElement(type);
      if (typeof atIndex === 'number') col.elements.splice(atIndex, 0, el);
      else col.elements.push(el);
      return {
        content: next,
        selected: { kind: 'element', sectionId, columnId, elementId: el.id },
        ...pushHistory(state as EditorState),
      };
    }),

  removeElement: (sectionId, columnId, elementId) =>
    set((state) => {
      const next = structuredClone(state.content);
      const col = next.sections.find((s) => s.id === sectionId)?.columns.find((c) => c.id === columnId);
      if (!col) return {};
      col.elements = col.elements.filter((e) => e.id !== elementId);
      return { content: next, selected: null, ...pushHistory(state as EditorState) };
    }),

  duplicateElement: (sectionId, columnId, elementId) =>
    set((state) => {
      const next = structuredClone(state.content);
      const col = next.sections.find((s) => s.id === sectionId)?.columns.find((c) => c.id === columnId);
      if (!col) return {};
      const idx = col.elements.findIndex((e) => e.id === elementId);
      if (idx === -1) return {};
      const clone = structuredClone(col.elements[idx]);
      clone.id = `e_${Math.random().toString(36).slice(2, 10)}`;
      col.elements.splice(idx + 1, 0, clone);
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  updateElementSettings: (sectionId, columnId, elementId, settings) =>
    set((state) => {
      const next = structuredClone(state.content);
      const col = next.sections.find((s) => s.id === sectionId)?.columns.find((c) => c.id === columnId);
      const el = col?.elements.find((e) => e.id === elementId);
      if (!el) return {};
      el.settings = { ...el.settings, ...settings };
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  moveElement: ({ fromSection, fromColumn, elementId, toSection, toColumn, toIndex }) =>
    set((state) => {
      const next = structuredClone(state.content);
      const fromCol = next.sections.find((s) => s.id === fromSection)?.columns.find((c) => c.id === fromColumn);
      const toCol = next.sections.find((s) => s.id === toSection)?.columns.find((c) => c.id === toColumn);
      if (!fromCol || !toCol) return {};
      const idx = fromCol.elements.findIndex((e) => e.id === elementId);
      if (idx === -1) return {};
      const [moved] = fromCol.elements.splice(idx, 1);
      const insertAt = Math.max(0, Math.min(toIndex, toCol.elements.length));
      toCol.elements.splice(insertAt, 0, moved);
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  replaceContent: (c) => set((state) => ({ content: c, ...pushHistory(state as EditorState) })),
  appendSection: (s) =>
    set((state) => {
      const next = structuredClone(state.content);
      next.sections.push(s);
      return { content: next, selected: { kind: 'section', sectionId: s.id }, ...pushHistory(state as EditorState) };
    }),
  replaceSection: (sectionId, newSection) =>
    set((state) => {
      const next = structuredClone(state.content);
      const idx = next.sections.findIndex((s) => s.id === sectionId);
      if (idx === -1) return {};
      // Mantieni l'id originale per non perdere selezione/riferimenti
      next.sections[idx] = { ...newSection, id: sectionId };
      return { content: next, selected: { kind: 'section', sectionId }, ...pushHistory(state as EditorState) };
    }),

  // ===== Style clipboard =====
  styleClipboard: null,

  copyStyle: (target) =>
    set((state) => {
      const found = findNode(state.content, target);
      if (!found) return {};
      const settings = (found.node as { settings?: Record<string, unknown> }).settings || {};
      const styles = extractStyleKeys(settings);
      const widgetType = found.kind === 'element'
        ? (found.node as ElementNode).type
        : undefined;
      return { styleClipboard: { kind: target.kind as 'element' | 'column' | 'section', widgetType, styles } };
    }),

  pasteStyle: (target) =>
    set((state) => {
      const sc = state.styleClipboard;
      if (!sc) return {};
      const next = structuredClone(state.content);
      const found = findNode(next, target);
      if (!found) return {};
      // Same kind required (element→element, column→column, section→section)
      if (sc.kind !== target.kind) return {};
      // Per element, mantieni il widgetType e content esistenti, sovrascrivi solo le chiavi stilistiche
      const node = found.node as { settings: Record<string, unknown> };
      const existing = node.settings || {};
      // Filtra le chiavi content esistenti e merge styles dal clipboard
      const contentOnly: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(existing)) {
        if (CONTENT_KEYS.has(k)) contentOnly[k] = v;
      }
      node.settings = { ...contentOnly, ...sc.styles };
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  resetStyle: (target) =>
    set((state) => {
      const next = structuredClone(state.content);
      const found = findNode(next, target);
      if (!found) return {};
      const node = found.node as { settings: Record<string, unknown> };
      const existing = node.settings || {};
      const contentOnly: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(existing)) {
        if (CONTENT_KEYS.has(k)) contentOnly[k] = v;
      }
      const widgetType = found.kind === 'element' ? (found.node as ElementNode).type : undefined;
      const defaultStyles = widgetDefaultStyle(widgetType);
      node.settings = { ...contentOnly, ...defaultStyles };
      return { content: next, ...pushHistory(state as EditorState) };
    }),

  undo: () => {
    const { history, content } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      content: prev,
      history: history.slice(0, -1),
      future: [content, ...get().future],
      isDirty: true,
    });
  },

  redo: () => {
    const { future, content } = get();
    if (future.length === 0) return;
    const [next, ...rest] = future;
    set({
      content: next,
      future: rest,
      history: [...get().history, content],
      isDirty: true,
    });
  },
}));
