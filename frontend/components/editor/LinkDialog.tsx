import { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { X } from 'lucide-react';

interface LinkDialogProps {
  editor: Editor;
  onClose: () => void;
}

export default function LinkDialog({ editor, onClose }: LinkDialogProps) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Pre-fill with selected text
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, '');
    setText(selectedText);

    // Pre-fill URL if link is active
    if (editor.isActive('link')) {
      const attrs = editor.getAttributes('link');
      setUrl(attrs.href || '');
    }

    urlRef.current?.focus();
  }, [editor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    if (text && !editor.state.selection.empty) {
      // Replace selected text with link
      editor.chain().focus().setLink({ href: url }).run();
    } else if (text) {
      // Insert new text with link
      editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
            Insert Link
          </h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              URL
            </label>
            <input
              ref={urlRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Text (optional)
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link text"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Insert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
