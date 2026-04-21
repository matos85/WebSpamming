"use client";

import { apiFetch } from "@/lib/api";
import { btnDangerBlock } from "@/lib/ui";
import { useMailing } from "@/components/MailingContext";

export default function DataPage() {
  const { refresh, setFlash } = useMailing();

  async function cleanupMe(action: string) {
    if (!confirm(`Выполнить очистку: ${action}?`)) return;
    setFlash(null);
    const res = await apiFetch("/cleanup/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setFlash(await res.text());
    await refresh();
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-50">
        Мои данные
      </h1>
      <p className="mb-8 max-w-xl text-sm text-zinc-400">
        Удаление необратимо. Затрагиваются только ваши списки и история
        отправок.
      </p>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-100">Очистка</h2>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className={btnDangerBlock}
            onClick={() => cleanupMe("lists")}
          >
            Удалить все мои списки и адреса
          </button>
          <button
            type="button"
            className={btnDangerBlock}
            onClick={() => cleanupMe("send_history")}
          >
            Удалить историю отправок
          </button>
          <button
            type="button"
            className={btnDangerBlock}
            onClick={() => cleanupMe("all_my_data")}
          >
            Удалить всё моё (списки + история)
          </button>
        </div>
      </section>
    </div>
  );
}
