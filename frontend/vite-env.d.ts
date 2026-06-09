/// <reference types="vite/client" />

declare module 'tiptap-markdown' {
  import { Extension } from '@tiptap/core';

  export interface MarkdownStorage {
    getMarkdown: () => string;
    setContent: (content: string) => void;
  }

  export const Markdown: Extension;
}

declare module '@tiptap/core' {
  interface Storage {
    markdown: import('tiptap-markdown').MarkdownStorage;
  }
}
