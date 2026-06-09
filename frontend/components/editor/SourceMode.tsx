interface SourceModeProps {
  content: string;
  onChange: (md: string) => void;
  placeholder?: string;
}

export default function SourceMode({ content, onChange, placeholder }: SourceModeProps) {
  return (
    <textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-none outline-none text-xl leading-loose text-stone-800 dark:text-stone-200 resize-none overflow-y-auto placeholder:text-stone-300 dark:placeholder:text-stone-700 flex-1 transition-colors font-serif pb-32 scrollbar-thin scrollbar-thumb-stone-200 dark:scrollbar-thumb-stone-800"
      style={{ minHeight: '60vh' }}
    />
  );
}
