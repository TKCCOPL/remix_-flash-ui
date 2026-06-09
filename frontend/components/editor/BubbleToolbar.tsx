import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3, Link as LinkIcon } from 'lucide-react';

interface BubbleToolbarProps {
  editor: Editor;
  onLinkClick: () => void;
}

export default function BubbleToolbar({ editor, onLinkClick }: BubbleToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const { from, to, empty } = editor.state.selection;

    if (empty || from === to) {
      setIsVisible(false);
      return;
    }

    // Get the selection coordinates
    const { view } = editor;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    // Position the toolbar above the selection
    const top = start.top - 50;
    const left = (start.left + end.left) / 2;

    setPosition({ top, left });
    setIsVisible(true);
  }, [editor]);

  useEffect(() => {
    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', () => {
      // Delay hiding to allow button clicks to register
      setTimeout(() => setIsVisible(false), 200);
    });

    return () => {
      editor.off('selectionUpdate', updatePosition);
    };
  }, [editor, updatePosition]);

  // Use onMouseDown with preventDefault to keep editor focus
  const handleMouseDown = useCallback((e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    action();
  }, []);

  if (!isVisible || !position) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-0.5 p-1 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800/50 rounded-xl shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <ToolbarButton
        active={editor.isActive('bold')}
        onMouseDown={(e) => handleMouseDown(e, () => editor.chain().focus().toggleBold().run())}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('italic')}
        onMouseDown={(e) => handleMouseDown(e, () => editor.chain().focus().toggleItalic().run())}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('strike')}
        onMouseDown={(e) => handleMouseDown(e, () => editor.chain().focus().toggleStrike().run())}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

      <ToolbarButton
        active={editor.isActive('heading', { level: 1 })}
        onMouseDown={(e) => handleMouseDown(e, () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onMouseDown={(e) => handleMouseDown(e, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        onMouseDown={(e) => handleMouseDown(e, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

      <ToolbarButton
        active={editor.isActive('code')}
        onMouseDown={(e) => handleMouseDown(e, () => editor.chain().focus().toggleCode().run())}
        title="Inline Code"
      >
        <Code className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('link')}
        onMouseDown={(e) => handleMouseDown(e, onLinkClick)}
        title="Link"
      >
        <LinkIcon className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  children,
  active,
  onMouseDown,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
      }`}
    >
      {children}
    </button>
  );
}
