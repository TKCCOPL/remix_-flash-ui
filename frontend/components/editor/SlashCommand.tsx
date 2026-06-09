import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import {
  Image, Code2, Quote, Minus, ListChecks, List, ListOrdered,
  Heading1, Heading2, Heading3,
} from 'lucide-react';

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: (editor: Editor) => void;
}

interface SlashCommandProps {
  editor: Editor;
  commands: CommandItem[];
  onClose: () => void;
}

export function getSlashCommands(t: any): CommandItem[] {
  return [
    {
      title: t.editor.slashCommands.image,
      description: t.editor.slashCommands.imageDesc,
      icon: <Image className="w-5 h-5" />,
      action: (editor) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/gif,image/webp';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            alert('图片不能超过 5MB');
            return;
          }
          try {
            const { uploadApi } = await import('../../api/upload');
            const { url } = await uploadApi.uploadImage(file);
            editor.chain().focus().setImage({ src: url }).run();
          } catch (err) {
            alert('上传失败，请重试');
          }
        };
        input.click();
      },
    },
    {
      title: t.editor.slashCommands.codeBlock,
      description: t.editor.slashCommands.codeBlockDesc,
      icon: <Code2 className="w-5 h-5" />,
      action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: t.editor.slashCommands.blockquote,
      description: t.editor.slashCommands.blockquoteDesc,
      icon: <Quote className="w-5 h-5" />,
      action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      title: t.editor.slashCommands.horizontalRule,
      description: t.editor.slashCommands.horizontalRuleDesc,
      icon: <Minus className="w-5 h-5" />,
      action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      title: t.editor.slashCommands.taskList,
      description: t.editor.slashCommands.taskListDesc,
      icon: <ListChecks className="w-5 h-5" />,
      action: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
    {
      title: t.editor.slashCommands.bulletList,
      description: t.editor.slashCommands.bulletListDesc,
      icon: <List className="w-5 h-5" />,
      action: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: t.editor.slashCommands.orderedList,
      description: t.editor.slashCommands.orderedListDesc,
      icon: <ListOrdered className="w-5 h-5" />,
      action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: t.editor.slashCommands.heading1,
      description: t.editor.slashCommands.heading1Desc,
      icon: <Heading1 className="w-5 h-5" />,
      action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: t.editor.slashCommands.heading2,
      description: t.editor.slashCommands.heading2Desc,
      icon: <Heading2 className="w-5 h-5" />,
      action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: t.editor.slashCommands.heading3,
      description: t.editor.slashCommands.heading3Desc,
      icon: <Heading3 className="w-5 h-5" />,
      action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ];
}

export default function SlashCommand({ editor, commands, onClose }: SlashCommandProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Get the current query from the editor content after "/"
  const getQuery = useCallback(() => {
    const { state } = editor;
    const { from } = state.selection;
    const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '');
    const slashIndex = textBefore.lastIndexOf('/');
    if (slashIndex >= 0) {
      return textBefore.substring(slashIndex + 1).toLowerCase();
    }
    return '';
  }, [editor]);

  const query = getQuery();

  const filtered = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query)
  );

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const selectCommand = useCallback((cmd: CommandItem) => {
    // Delete the / and any filter text
    const { state } = editor;
    const { from } = state.selection;
    const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '');
    const slashIndex = textBefore.lastIndexOf('/');
    if (slashIndex >= 0) {
      const deleteFrom = from - (textBefore.length - slashIndex);
      editor.chain().focus().deleteRange({ from: deleteFrom, to: from }).run();
    }
    cmd.action(editor);
    onClose();
  }, [editor, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (filtered[selectedIndex]) {
          selectCommand(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        // Tab also selects the command
        if (filtered[selectedIndex]) {
          selectCommand(filtered[selectedIndex]);
        }
      }
    };

    // Use capture phase to intercept before editor
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [filtered, selectedIndex, selectCommand, onClose]);

  // Close if no filtered results and query is long enough
  useEffect(() => {
    if (filtered.length === 0 && query.length > 3) {
      onClose();
    }
  }, [filtered.length, query.length, onClose]);

  return (
    <div
      ref={containerRef}
      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl max-h-64 overflow-y-auto w-72"
    >
      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-sm text-stone-500">No results</div>
      ) : (
        filtered.map((cmd, index) => (
          <button
            key={cmd.title}
            ref={index === selectedIndex ? selectedRef : null}
            type="button"
            className={`flex items-center gap-3 px-3 py-2 w-full text-left cursor-pointer transition-colors ${
              index === selectedIndex
                ? 'bg-indigo-50 dark:bg-indigo-900/30'
                : 'hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
            onClick={(e) => {
              e.preventDefault();
              selectCommand(cmd);
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              index === selectedIndex
                ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}>
              {cmd.icon}
            </div>
            <div>
              <div className={`text-sm font-medium ${
                index === selectedIndex
                  ? 'text-indigo-700 dark:text-indigo-200'
                  : 'text-stone-800 dark:text-stone-200'
              }`}>{cmd.title}</div>
              <div className="text-xs text-stone-500">{cmd.description}</div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
