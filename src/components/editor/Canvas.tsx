'use client';

import { useDraggable, useDroppable, useDndMonitor } from '@dnd-kit/core';
import { useState } from 'react';
import { useEditor } from '@/lib/editor-store';
import type { ColumnNode, ElementNode, SectionNode } from '@/lib/widgets-schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { renderWidget } from './widgets/render';
import { WIDGETS } from '@/lib/widgets-schema';
import * as LucideIcons from 'lucide-react';
import { Copy, Trash2, GripVertical, Plus, Columns, ClipboardCopy, Clipboard, Sparkles, Settings2, ChevronUp, ChevronDown, Edit3, ColumnsIcon, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator, ContextMenuLabel,
} from '@/components/ui/context-menu';

const DEVICE_WIDTH = { desktop: '100%', tablet: '768px', mobile: '375px' } as const;

/** Converte oggetto background ({ type, color, image, overlay, gradient, size, position }) in CSS. */
function bgObjToCss(bg: Record<string, unknown>): string | undefined {
  if (!bg) return undefined;
  const layers: string[] = [];
  if (bg.overlay) layers.push(bg.overlay as string);
  if (bg.image) {
    const size = (bg.size as string) ?? 'cover';
    const pos = (bg.position as string) ?? 'center';
    layers.push(`url("${bg.image}") ${pos}/${size} no-repeat`);
  } else if (bg.gradient) {
    layers.push(bg.gradient as string);
  }
  const cssLayers = layers.join(', ');
  if (bg.color) return cssLayers ? `${cssLayers}, ${bg.color}` : (bg.color as string);
  return cssLayers || undefined;
}

export function Canvas() {
  const content = useEditor((s) => s.content);
  const device = useEditor((s) => s.device);
  const addSection = useEditor((s) => s.addSection);
  const [isDragging, setIsDragging] = useState(false);

  // Tracking drag globale per allargare le drop zone visivamente
  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDragCancel: () => setIsDragging(false),
  });

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="min-h-full flex justify-center py-6 px-6 editor-canvas">
          <div
            className="bg-white shadow-2xl transition-all duration-300 min-h-[80vh]"
            style={{ width: DEVICE_WIDTH[device], maxWidth: '100%' }}
          >
            {content.sections.length === 0 ? (
              <EmptyDropZone onAdd={() => addSection(1)} />
            ) : (
              <>
                <SectionInsertionZone index={0} expanded={isDragging} />
                {content.sections.map((s, i) => (
                  <div key={s.id}>
                    <SectionView section={s} index={i} />
                    <SectionInsertionZone index={i + 1} expanded={isDragging} />
                  </div>
                ))}
              </>
            )}
            {content.sections.length > 0 && (
              <button
                onClick={() => addSection(1)}
                className="w-full py-5 border-2 border-dashed border-gray-200 hover:border-[#92003b] hover:bg-[#92003b]/5 text-sm text-muted-foreground hover:text-[#92003b] flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" /> Aggiungi nuova sezione
              </button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function EmptyDropZone({ onAdd }: { onAdd: () => void }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'empty-drop',
    data: { kind: 'insert-section', index: 0 },
  });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8 m-4 border-2 border-dashed rounded-xl transition-colors ${
        isOver ? 'border-[#92003b] bg-[#92003b]/5' : 'border-gray-200'
      }`}
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92003b] to-[#a4286a] text-white flex items-center justify-center">
        <Plus className="h-8 w-8" />
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-1">Inizia a costruire</h3>
        <p className="text-muted-foreground">Trascina un widget o una struttura qui.</p>
      </div>
      <button onClick={onAdd} className="px-5 py-2.5 rounded-lg bg-[#92003b] text-white font-medium hover:bg-[#92003b]/90">
        Aggiungi nuova sezione
      </button>
    </div>
  );
}

// ============ SECTION ============

function SectionInsertionZone({ index, expanded }: { index: number; expanded: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `sec-insert-${index}`,
    data: { kind: 'insert-section', index },
  });
  // Quando un drag è in corso, allargo la zona per renderla facilmente droppable
  return (
    <div
      ref={setNodeRef}
      className={`relative z-20 transition-all ${expanded ? 'h-8 my-1' : 'h-2 -my-1'}`}
    >
      {expanded && (
        <div className={`absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-md border-2 border-dashed transition-all ${
          isOver ? 'border-[#92003b] bg-[#92003b]/10 h-7' : 'border-[#92003b]/30 h-5'
        }`} />
      )}
      {!expanded && isOver && (
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-1 bg-[#92003b] rounded-full shadow-[0_0_12px_rgba(146,0,59,0.6)]" />
      )}
    </div>
  );
}

function SectionView({ section, index }: { section: SectionNode; index: number }) {
  const addSectionAtIndex = useEditor((s) => s.addSectionAtIndex);
  const select = useEditor((s) => s.select);
  const selected = useEditor((s) => s.selected);
  const removeSection = useEditor((s) => s.removeSection);
  const duplicateSection = useEditor((s) => s.duplicateSection);
  const copyToClipboard = useEditor((s) => s.copyToClipboard);
  const pasteFromClipboard = useEditor((s) => s.pasteFromClipboard);
  const clipboard = useEditor((s) => s.clipboard);
  const copyStyle = useEditor((s) => s.copyStyle);
  const pasteStyle = useEditor((s) => s.pasteStyle);
  const resetStyle = useEditor((s) => s.resetStyle);
  const styleClipboard = useEditor((s) => s.styleClipboard);
  const addColumn = useEditor((s) => s.addColumn);

  const isSelected = selected?.kind === 'section' && selected.sectionId === section.id;
  const settings = section.settings as { padding?: string; background?: string; gap?: string; color?: string };

  const { attributes, listeners, setNodeRef, isDragging: dragging } = useDraggable({
    id: `section-${section.id}`,
    data: { kind: 'section', sectionId: section.id },
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          id={`en-node-${section.id}`}
          data-en-id={section.id}
          data-en-kind="section"
          className={`relative section-outline group/section ${isSelected ? 'selected' : ''} ${dragging ? 'opacity-30' : ''}`}
          style={{
            padding: settings.padding ?? (settings.paddingTop || settings.paddingBottom
              ? `${settings.paddingTop ?? '0'}px 20px ${settings.paddingBottom ?? '0'}px` : '40px 20px'),
            background: typeof settings.background === 'object' ? bgObjToCss(settings.background as Record<string, unknown>) : (settings.background ?? 'transparent'),
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: settings.color,
            minHeight: settings.minHeight as string | undefined,
          }}
          onClick={(e) => {
            e.stopPropagation();
            select({ kind: 'section', sectionId: section.id });
          }}
        >
          {/* Section toolbar */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center bg-[#92003b] text-white text-xs rounded-md overflow-hidden shadow-lg">
            <button {...attributes} {...listeners} className="px-2 py-1.5 hover:bg-black/20 cursor-grab active:cursor-grabbing" title="Trascina sezione" onClick={(e) => e.stopPropagation()}>
              <Columns className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 py-1.5 border-l border-white/20 font-medium">Sezione</span>
            <button className="px-2 py-1.5 hover:bg-black/20 border-l border-white/20" title="Aggiungi sezione sopra" onClick={(e) => { e.stopPropagation(); addSectionAtIndex(1, index); }}>
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button className="px-2 py-1.5 hover:bg-black/20 border-l border-white/20" title="Aggiungi sezione sotto" onClick={(e) => { e.stopPropagation(); addSectionAtIndex(1, index + 1); }}>
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button className="px-2 py-1.5 hover:bg-black/20 border-l border-white/20" title="Duplica" onClick={(e) => { e.stopPropagation(); duplicateSection(section.id); }}>
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button className="px-2 py-1.5 hover:bg-black/20 border-l border-white/20" title="Elimina" onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap w-full" style={{ gap: settings.gap ?? '0' }}>
            {section.columns.map((col) => (
              <ColumnView key={col.id} sectionId={section.id} column={col} />
            ))}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuLabel>Sezione</ContextMenuLabel>
        <ContextMenuItem onSelect={() => addColumn(section.id)}>
          <Plus className="h-4 w-4" />Aggiungi colonna
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => duplicateSection(section.id)}>
          <Copy className="h-4 w-4" />Duplica
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => copyToClipboard('section', { sectionId: section.id })}>
          <ClipboardCopy className="h-4 w-4" />Copia
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!clipboard}
          onSelect={() => pasteFromClipboard({ afterIndex: undefined })}
        >
          <Clipboard className="h-4 w-4" />Incolla {clipboard ? `(${clipboard.kind})` : ''}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuLabel>Stile</ContextMenuLabel>
        <ContextMenuItem onSelect={() => copyStyle({ kind: 'section', sectionId: section.id })}>
          <Copy className="h-4 w-4" />Copia stile <span className="ml-auto text-[10px] text-muted-foreground">⌘⌥C</span>
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!styleClipboard || styleClipboard.kind !== 'section'}
          onSelect={() => pasteStyle({ kind: 'section', sectionId: section.id })}
        >
          <Clipboard className="h-4 w-4" />Incolla stile <span className="ml-auto text-[10px] text-muted-foreground">⌘⌥V</span>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => { if (confirm('Reset stile ai default?')) resetStyle({ kind: 'section', sectionId: section.id }); }}>
          <RotateCcw className="h-4 w-4" />Reset stile <span className="ml-auto text-[10px] text-muted-foreground">⌘⌥R</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => select({ kind: 'section', sectionId: section.id })}>
          <Settings2 className="h-4 w-4" />Impostazioni
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem destructive onSelect={() => removeSection(section.id)}>
          <Trash2 className="h-4 w-4" />Elimina sezione
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ============ COLUMN ============

function ColumnView({ sectionId, column }: { sectionId: string; column: ColumnNode }) {
  const select = useEditor((s) => s.select);
  const selected = useEditor((s) => s.selected);
  const removeColumn = useEditor((s) => s.removeColumn);
  const duplicateColumn = useEditor((s) => s.duplicateColumn);
  const copyToClipboard = useEditor((s) => s.copyToClipboard);
  const pasteFromClipboard = useEditor((s) => s.pasteFromClipboard);
  const clipboard = useEditor((s) => s.clipboard);
  const copyStyle = useEditor((s) => s.copyStyle);
  const pasteStyle = useEditor((s) => s.pasteStyle);
  const resetStyle = useEditor((s) => s.resetStyle);
  const styleClipboard = useEditor((s) => s.styleClipboard);
  const isSelected = selected?.kind === 'column' && selected.columnId === column.id;
  const settings = column.settings as { padding?: string; align?: string; background?: string };

  const { setNodeRef, isOver } = useDroppable({
    id: `col-empty-${column.id}`,
    data: { kind: 'insert-element', sectionId, columnId: column.id, index: 0 },
    disabled: column.elements.length > 0,
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          id={`en-node-${column.id}`}
          data-en-id={column.id}
          data-en-kind="column"
          className={`column-outline relative group/col ${isSelected ? 'selected' : ''}`}
          style={{
            flex: `0 0 ${column.width}%`,
            maxWidth: `${column.width}%`,
            padding: settings.padding ?? '10px',
            background: typeof settings.background === 'object' ? bgObjToCss(settings.background as Record<string, unknown>) : settings.background,
            textAlign: (settings.align as 'left'|'center'|'right') ?? 'left',
            minWidth: 0,
          }}
          onClick={(e) => {
            e.stopPropagation();
            select({ kind: 'column', sectionId, columnId: column.id });
          }}
        >
          {/* Column toolbar - top right */}
          <div className="absolute top-1 right-1 z-20 opacity-0 group-hover/col:opacity-100 transition-opacity flex items-center bg-[#61ce70] text-white text-[10px] rounded overflow-hidden shadow">
            <span className="px-1.5 py-1 font-medium">Col {column.width}%</span>
            <button className="px-1.5 py-1 hover:bg-black/20 border-l border-white/20" title="Duplica colonna" onClick={(e) => { e.stopPropagation(); duplicateColumn(sectionId, column.id); }}>
              <Copy className="h-3 w-3" />
            </button>
            <button className="px-1.5 py-1 hover:bg-black/20 border-l border-white/20" title="Elimina colonna" onClick={(e) => { e.stopPropagation(); removeColumn(sectionId, column.id); }}>
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {column.elements.length === 0 ? (
            <div className={`border-2 border-dashed rounded-lg p-8 text-center text-xs transition-colors ${
              isOver ? 'border-[#92003b] bg-[#92003b]/5 text-[#92003b]' : 'border-gray-300 text-muted-foreground'
            }`}>
              {isOver ? 'Rilascia qui' : 'Trascina widget qui'}
            </div>
          ) : (
            <>
              <ElementInsertionZone sectionId={sectionId} columnId={column.id} index={0} />
              {column.elements.map((el, idx) => (
                <div key={el.id}>
                  <ElementView sectionId={sectionId} columnId={column.id} element={el} index={idx} />
                  <ElementInsertionZone sectionId={sectionId} columnId={column.id} index={idx + 1} />
                </div>
              ))}
            </>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuLabel>Colonna ({column.width}%)</ContextMenuLabel>
        <ContextMenuItem onSelect={() => duplicateColumn(sectionId, column.id)}>
          <Copy className="h-4 w-4" />Duplica colonna
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => copyToClipboard('column', { sectionId, columnId: column.id })}>
          <ClipboardCopy className="h-4 w-4" />Copia colonna
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!clipboard}
          onSelect={() => pasteFromClipboard({ sectionId, columnId: column.id })}
        >
          <Clipboard className="h-4 w-4" />Incolla {clipboard ? `(${clipboard.kind})` : ''}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuLabel>Stile</ContextMenuLabel>
        <ContextMenuItem onSelect={() => copyStyle({ kind: 'column', sectionId, columnId: column.id })}>
          <Copy className="h-4 w-4" />Copia stile <span className="ml-auto text-[10px] text-muted-foreground">⌘⌥C</span>
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!styleClipboard || styleClipboard.kind !== 'column'}
          onSelect={() => pasteStyle({ kind: 'column', sectionId, columnId: column.id })}
        >
          <Clipboard className="h-4 w-4" />Incolla stile <span className="ml-auto text-[10px] text-muted-foreground">⌘⌥V</span>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => { if (confirm('Reset stile ai default?')) resetStyle({ kind: 'column', sectionId, columnId: column.id }); }}>
          <RotateCcw className="h-4 w-4" />Reset stile <span className="ml-auto text-[10px] text-muted-foreground">⌘⌥R</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => select({ kind: 'column', sectionId, columnId: column.id })}>
          <Settings2 className="h-4 w-4" />Impostazioni
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem destructive onSelect={() => removeColumn(sectionId, column.id)}>
          <Trash2 className="h-4 w-4" />Elimina colonna
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ============ ELEMENT ============

function ElementInsertionZone({ sectionId, columnId, index }: { sectionId: string; columnId: string; index: number }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `el-insert-${columnId}-${index}`,
    data: { kind: 'insert-element', sectionId, columnId, index },
  });
  return (
    <div ref={setNodeRef} className="relative h-1.5 -my-0.5 z-10">
      {isOver && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-[#92003b] rounded-full shadow-[0_0_8px_rgba(146,0,59,0.6)] animate-pulse" />
      )}
    </div>
  );
}

function ElementView({ sectionId, columnId, element, index }: { sectionId: string; columnId: string; element: ElementNode; index: number }) {
  const select = useEditor((s) => s.select);
  const selected = useEditor((s) => s.selected);
  const removeElement = useEditor((s) => s.removeElement);
  const duplicateElement = useEditor((s) => s.duplicateElement);
  const updateElementSettings = useEditor((s) => s.updateElementSettings);
  const copyToClipboard = useEditor((s) => s.copyToClipboard);
  const pasteFromClipboard = useEditor((s) => s.pasteFromClipboard);
  const clipboard = useEditor((s) => s.clipboard);
  const copyStyle = useEditor((s) => s.copyStyle);
  const pasteStyle = useEditor((s) => s.pasteStyle);
  const resetStyle = useEditor((s) => s.resetStyle);
  const styleClipboard = useEditor((s) => s.styleClipboard);
  const device = useEditor((s) => s.device);

  const hideOn = (element.settings._hideOn as string[]) ?? [];
  if (hideOn.includes(device)) return null;

  const styleObj = (element.settings._style as Record<string, string>) ?? {};
  const customClass = (element.settings._classes as string) ?? '';
  const customCss = (element.settings._css as string) ?? '';
  const htmlId = (element.settings._htmlId as string) || undefined;

  const isSelected = selected?.kind === 'element' && selected.elementId === element.id;
  const desc = WIDGETS[element.type];
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[desc?.icon ?? 'Box'] ?? LucideIcons.Box;

  const { attributes, listeners, setNodeRef, isDragging: dragging } = useDraggable({
    id: `el-${element.id}`,
    data: { kind: 'element', sectionId, columnId, elementId: element.id },
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          id={htmlId}
          data-en-id={element.id}
          data-en-kind="element"
          style={styleObj as React.CSSProperties}
          className={`relative element-outline group/el ${customClass} ${isSelected ? 'selected' : ''} ${dragging ? 'opacity-30' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            select({ kind: 'element', sectionId, columnId, elementId: element.id });
          }}
        >
          {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}

          <div className={`absolute -top-2.5 left-2 z-20 transition-opacity flex items-center bg-[#2196f3] text-white text-[11px] rounded overflow-hidden shadow ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/el:opacity-100'}`}>
            <button {...attributes} {...listeners} className="px-1.5 py-1 hover:bg-black/20 cursor-grab active:cursor-grabbing" title="Trascina" onClick={(e) => e.stopPropagation()}>
              <GripVertical className="h-3 w-3" />
            </button>
            <span className="px-1.5 py-1 border-l border-white/20 flex items-center gap-1 font-medium">
              <Icon className="h-3 w-3" />
              {desc?.label ?? element.type}
            </span>
            <button className="px-1.5 py-1 hover:bg-black/20 border-l border-white/20" onClick={(e) => { e.stopPropagation(); duplicateElement(sectionId, columnId, element.id); }} title="Duplica">
              <Copy className="h-3 w-3" />
            </button>
            <button className="px-1.5 py-1 hover:bg-black/20 border-l border-white/20" onClick={(e) => { e.stopPropagation(); removeElement(sectionId, columnId, element.id); }} title="Elimina">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {renderWidget(element, {
            editable: true,
            onUpdate: (patch) => updateElementSettings(sectionId, columnId, element.id, patch),
          })}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuLabel>{desc?.label ?? element.type}</ContextMenuLabel>
        <ContextMenuItem onSelect={() => select({ kind: 'element', sectionId, columnId, elementId: element.id })}>
          <Edit3 className="h-4 w-4" />Modifica
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => duplicateElement(sectionId, columnId, element.id)}>
          <Copy className="h-4 w-4" />Duplica
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => copyToClipboard('element', { sectionId, columnId, elementId: element.id })}>
          <ClipboardCopy className="h-4 w-4" />Copia
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!clipboard || clipboard.kind !== 'element'}
          onSelect={() => pasteFromClipboard({ sectionId, columnId, afterIndex: index })}
        >
          <Clipboard className="h-4 w-4" />Incolla dopo
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuLabel>Stile</ContextMenuLabel>
        <ContextMenuItem onSelect={() => copyStyle({ kind: 'element', sectionId, columnId, elementId: element.id })}>
          <Copy className="h-4 w-4" />Copia stile <span className="ml-auto text-[10px] text-muted-foreground">⌘⌥C</span>
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!styleClipboard || styleClipboard.kind !== 'element'}
          onSelect={() => pasteStyle({ kind: 'element', sectionId, columnId, elementId: element.id })}
        >
          <Clipboard className="h-4 w-4" />Incolla stile <span className="ml-auto text-[10px] text-muted-foreground">⌘⌥V</span>
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => { if (confirm('Reset stile ai default?')) resetStyle({ kind: 'element', sectionId, columnId, elementId: element.id }); }}>
          <RotateCcw className="h-4 w-4" />Reset stile <span className="ml-auto text-[10px] text-muted-foreground">⌘⌥R</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem destructive onSelect={() => removeElement(sectionId, columnId, element.id)}>
          <Trash2 className="h-4 w-4" />Elimina
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
