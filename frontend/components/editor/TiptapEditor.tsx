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
import { useEffect, useRef, useState, useCallback } from 'react';
import { useI18n } from '../../context/Preferences';
import BubbleToolbar from './BubbleToolbar';
import SlashCommand, { getSlashCommands } from './SlashCommand';
import LinkDialog from './LinkDialog';
import './editor.css';

const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: string;
  onChange: (md: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const isExternalUpdate = useRef(false);
  const t = useI18n();
  const [showSlashCommand, setShowSlashCommand] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const commands = getSlashCommands(t);

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
    editorProps: {
      handleKeyDown: (view, event) => {
        // Detect "/" at line start for slash commands
        if (event.key === '/') {
          const { state } = view;
          const { from } = state.selection;
          const textBefore = state.doc.textBetween(Math.max(0, from - 1), from, '');
          if (textBefore === '' || textBefore === '\n') {
            setShowSlashCommand(true);
          }
        }
        return false;
      },
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

  const handleSlashClose = useCallback(() => {
    setShowSlashCommand(false);
    editor?.commands.focus();
  }, [editor]);

  const handleLinkClick = useCallback(() => {
    setShowLinkDialog(true);
  }, []);

  const handleLinkClose = useCallback(() => {
    setShowLinkDialog(false);
    editor?.commands.focus();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="relative">
      <BubbleToolbar editor={editor} onLinkClick={handleLinkClick} />
      <EditorContent editor={editor} />

      {showSlashCommand && (
        <div className="absolute left-0 top-full z-50 mt-1">
          <SlashCommand
            editor={editor}
            commands={commands}
            onClose={handleSlashClose}
          />
        </div>
      )}

      {showLinkDialog && (
        <LinkDialog editor={editor} onClose={handleLinkClose} />
      )}
    </div>
  );
}
