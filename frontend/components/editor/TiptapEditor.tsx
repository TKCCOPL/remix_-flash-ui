import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { common, createLowlight } from 'lowlight';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useRef } from 'react';
import './editor.css';

const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: string;
  onChange: (md: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const isExternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
      }),
      Image.configure({
        allowBase64: true,
        inline: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
      Highlight,
      Typography,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      try {
        isExternalUpdate.current = true;
        const md = editor.storage.markdown?.getMarkdown?.() ?? '';
        onChange(md);
        requestAnimationFrame(() => {
          isExternalUpdate.current = false;
        });
      } catch (e) {
        console.error('TiptapEditor onUpdate error:', e);
      }
    },
  });

  useEffect(() => {
    if (editor && !isExternalUpdate.current) {
      try {
        const currentMd = editor.storage.markdown?.getMarkdown?.() ?? '';
        if (content !== currentMd) {
          editor.commands.setContent(content);
        }
      } catch (e) {
        console.error('TiptapEditor content sync error:', e);
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
