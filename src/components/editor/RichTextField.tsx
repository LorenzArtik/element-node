'use client';

import { useEditor as useTipTap, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useEffect } from 'react';
import { t } from '@/lib/admin-i18n';

export function RichTextField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editor = useTipTap({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '<p></p>',
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'tiptap min-h-[100px] p-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring',
      },
    },
  });

  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const Btn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-accent ${active ? 'bg-accent' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5 p-1 border rounded-md bg-muted/30 flex-wrap">
        <Btn title={t('Grassetto', 'Bold')} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></Btn>
        <Btn title={t('Corsivo', 'Italic')} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></Btn>
        <Btn title={t('Lista', 'List')} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></Btn>
        <Btn title={t('Lista num.', 'Numbered list')} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></Btn>
        <Btn title={t('Sinistra', 'Left')} active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-3.5 w-3.5" /></Btn>
        <Btn title={t('Centro', 'Center')} active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-3.5 w-3.5" /></Btn>
        <Btn title={t('Destra', 'Right')} active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="h-3.5 w-3.5" /></Btn>
        <Btn title="Link" active={editor.isActive('link')} onClick={() => {
          const url = prompt(t('URL del link:', 'Link URL:'));
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}><LinkIcon className="h-3.5 w-3.5" /></Btn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
