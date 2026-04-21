"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { inputClass, btnPrimary } from "@/lib/ui";
import { useMailing } from "@/components/MailingContext";

type SendResultRow = {
  to_email: string;
  status: string;
  error: string | null;
};

type SendResponse = {
  job_id: number;
  recipients: number;
  sent: number;
  failed: number;
  results?: SendResultRow[];
};

export default function SendPage() {
  const { lists, selectedListId, setSelectedListId, setFlash } = useMailing();
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [allowHtmlBody, setAllowHtmlBody] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendPhase, setSendPhase] = useState<string | null>(null);
  const [lastSend, setLastSend] = useState<SendResponse | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/mailing/options");
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as {
        allow_html_body?: boolean;
      };
      const allowed = data.allow_html_body !== false;
      setAllowHtmlBody(allowed);
      if (!allowed) setBodyHtml("");
    })();
  }, []);

  async function sendMailing() {
    if (selectedListId == null) {
      setFlash("Выберите список на странице «Списки и адреса».");
      return;
    }
    setFlash(null);
    setLastSend(null);
    setSending(true);
    setSendPhase("Рассылка началась, идёт отправка писем…");
    try {
      const res = await apiFetch("/mailing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailing_list_id: selectedListId,
          subject,
          body_text: bodyText || null,
          body_html: allowHtmlBody ? bodyHtml || null : null,
          from_email: fromEmail.trim() || null,
          from_name: fromName.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | SendResponse
        | { detail?: unknown };
      if (!res.ok) {
        const detail = (data as { detail?: unknown }).detail;
        setSendPhase(null);
        setFlash(
          typeof detail === "string" ? detail : JSON.stringify(detail ?? data),
        );
        return;
      }
      const ok = data as SendResponse;
      setLastSend(ok);
      setSendPhase(
        `Рассылка завершена. Задание #${ok.job_id}: получателей ${ok.recipients}, отправлено ${ok.sent}, с ошибкой ${ok.failed}.`,
      );
      setFlash(null);
    } catch (e) {
      setSendPhase(null);
      setFlash(e instanceof Error ? e.message : "Ошибка сети");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-50">
        Отправка
      </h1>
      <p className="mb-8 max-w-xl text-sm text-zinc-400">
        Письма уходят всем адресам выбранного списка. Списки настраиваются в
        разделе «Списки и адреса».
      </p>

      <section className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-100">
          Список получателей
        </h2>
        {lists.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Нет списков — сначала создайте список и добавьте адреса.
          </p>
        ) : (
          <select
            className={`${inputClass} max-w-md`}
            value={selectedListId ?? ""}
            onChange={(e) =>
              setSelectedListId(e.target.value ? Number(e.target.value) : null)
            }
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id} className="bg-zinc-900">
                {l.name} (id {l.id})
              </option>
            ))}
          </select>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-100">
          Содержимое письма
        </h2>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-400">
            Тема
          </span>
          <input
            className={inputClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-400">
            Текст (plain)
          </span>
          <textarea
            className={`${inputClass} min-h-[8rem] resize-y`}
            rows={6}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-400">
            Email отправителя (необязательно)
          </span>
          <input
            className={inputClass}
            placeholder="По умолчанию: из SMTP настроек"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
          />
        </label>
        <label className="mb-5 block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-400">
            Имя отправителя (необязательно)
          </span>
          <input
            className={inputClass}
            placeholder="Оставьте пустым, чтобы показывался только email"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
          />
        </label>
        {allowHtmlBody ? (
          <label className="mb-5 block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">
              HTML (необязательно)
            </span>
            <textarea
              className={`${inputClass} min-h-[8rem] resize-y font-mono text-xs`}
              rows={6}
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
            />
          </label>
        ) : (
          <p className="mb-5 text-xs text-zinc-500">
            HTML-режим отключён администратором.
          </p>
        )}
        {sendPhase && (
          <p
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              sending
                ? "border-sky-900/50 bg-sky-950/30 text-sky-200"
                : "border-zinc-700 bg-zinc-950/50 text-zinc-300"
            }`}
          >
            {sendPhase}
          </p>
        )}

        {lastSend?.results && lastSend.results.some((r) => r.status === "failed") && (
          <div className="mb-4 rounded-lg border border-red-900/40 bg-red-950/20 p-3">
            <p className="mb-2 text-sm font-medium text-red-300">
              Ошибки по адресам
            </p>
            <ul className="max-h-48 space-y-2 overflow-y-auto text-xs text-red-200/90">
              {lastSend.results
                .filter((r) => r.status === "failed")
                .map((r) => (
                  <li key={r.to_email} className="font-mono">
                    <span className="text-red-100">{r.to_email}</span>
                    {r.error ? (
                      <span className="mt-0.5 block whitespace-pre-wrap text-red-300/90">
                        {r.error}
                      </span>
                    ) : null}
                  </li>
                ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
          onClick={() => void sendMailing()}
          disabled={sending}
        >
          {sending ? "Отправка…" : "Отправить"}
        </button>
      </section>
    </div>
  );
}
