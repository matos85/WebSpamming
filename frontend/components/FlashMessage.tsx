"use client";

import { useMailing } from "@/components/MailingContext";

export function FlashMessage() {
  const { flash, setFlash } = useMailing();
  if (!flash) return null;
  return (
    <div className="flex items-start gap-3 border-b border-zinc-800 bg-zinc-900/90 px-4 py-3 md:px-8">
      <pre className="max-h-40 flex-1 overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-300">
        {flash}
      </pre>
      <button
        type="button"
        onClick={() => setFlash(null)}
        aria-label="Закрыть"
        className="shrink-0 rounded p-1 text-xl leading-none text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
      >
        ×
      </button>
    </div>
  );
}
