"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { btnDangerSm, btnSecondary, inputClass } from "@/lib/ui";
import { useMailing } from "@/components/MailingContext";

type RecipientRow = { id: number; organization: string; email: string };

export default function ListsPage() {
  const {
    lists,
    selectedListId,
    setSelectedListId,
    refresh,
    loading,
    setFlash,
  } = useMailing();
  const [newListName, setNewListName] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editOrganization, setEditOrganization] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [editListName, setEditListName] = useState("");

  const loadRecipients = useCallback(async () => {
    if (selectedListId == null) {
      setRecipients([]);
      return;
    }
    setRecipientsLoading(true);
    try {
      const res = await apiFetch(
        `/mailing-lists/${selectedListId}/recipients`,
      );
      if (!res.ok) {
        setFlash(await res.text());
        setRecipients([]);
        return;
      }
      const data = (await res.json()) as RecipientRow[];
      setRecipients(Array.isArray(data) ? data : []);
    } finally {
      setRecipientsLoading(false);
    }
  }, [selectedListId, setFlash]);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  async function createList() {
    setFlash(null);
    const res = await apiFetch("/mailing-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName }),
    });
    if (!res.ok) {
      setFlash(await res.text());
      return;
    }
    setNewListName("");
    await refresh();
    setFlash("Список создан.");
  }

  async function addRecipientsBulk() {
    if (selectedListId == null) return;
    setFlash(null);
    const lines = bulkEmails
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const line of lines) {
      let organization = "";
      let email = line;
      if (line.includes("|")) {
        const [orgPart, emailPart] = line.split("|", 2);
        organization = orgPart.trim();
        email = (emailPart || "").trim();
      }
      const res = await apiFetch(
        `/mailing-lists/${selectedListId}/recipients`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organization, email }),
        },
      );
      if (!res.ok) {
        setFlash(`Ошибка для ${line}: ${await res.text()}`);
        return;
      }
    }
    setBulkEmails("");
    setFlash(`Добавлено адресов: ${lines.length}`);
    await loadRecipients();
  }

  async function deleteList(id: number, name: string) {
    if (!confirm(`Удалить список «${name}» и все адреса в нём?`)) return;
    setFlash(null);
    const res = await apiFetch(`/mailing-lists/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setFlash(await res.text());
      return;
    }
    if (selectedListId === id) setSelectedListId(null);
    await refresh();
    setFlash("Список удалён.");
  }

  function startListEdit(id: number, name: string) {
    setEditingListId(id);
    setEditListName(name);
  }

  function cancelListEdit() {
    setEditingListId(null);
    setEditListName("");
  }

  async function saveListEdit(id: number) {
    const name = editListName.trim();
    if (!name) {
      setFlash("Название списка не может быть пустым");
      return;
    }
    setFlash(null);
    const res = await apiFetch(`/mailing-lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setFlash(await res.text());
      return;
    }
    cancelListEdit();
    await refresh();
    setFlash("Список обновлён.");
  }

  function startEdit(r: RecipientRow) {
    setEditingId(r.id);
    setEditOrganization(r.organization || "");
    setEditEmail(r.email);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditOrganization("");
    setEditEmail("");
  }

  async function saveEdit(recipientId: number) {
    if (selectedListId == null) return;
    setFlash(null);
    const res = await apiFetch(
      `/mailing-lists/${selectedListId}/recipients/${recipientId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization: editOrganization.trim(),
          email: editEmail.trim(),
        }),
      },
    );
    if (!res.ok) {
      setFlash(await res.text());
      return;
    }
    cancelEdit();
    await loadRecipients();
    setFlash("Адрес обновлён.");
  }

  async function deleteRecipient(recipientId: number, email: string) {
    if (selectedListId == null) return;
    if (!confirm(`Удалить адрес ${email}?`)) return;
    setFlash(null);
    const res = await apiFetch(
      `/mailing-lists/${selectedListId}/recipients/${recipientId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      setFlash(await res.text());
      return;
    }
    if (editingId === recipientId) cancelEdit();
    await loadRecipients();
    setFlash("Адрес удалён.");
  }

  if (loading) return <p className="text-zinc-500">Загрузка…</p>;

  const selected = lists.find((l) => l.id === selectedListId);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-50">
        Списки рассылки
      </h1>
      <p className="mb-8 max-w-xl text-sm text-zinc-400">
        Сначала создайте список, затем выберите его и добавьте адреса.
      </p>

      <section className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-100">
          Новый список
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} min-w-[200px] flex-1`}
            placeholder="Название (например: Клиенты Q1)"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button type="button" className={btnSecondary} onClick={createList}>
            Создать
          </button>
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-100">
          Ваши списки
        </h2>
        {lists.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Пока нет списков — создайте первый выше.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {lists.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="lid"
                    checked={selectedListId === l.id}
                    onChange={() => setSelectedListId(l.id)}
                    className="h-4 w-4 border-zinc-600 bg-zinc-900 text-sky-600 focus:ring-sky-500"
                  />
                  {editingListId === l.id ? (
                    <input
                      className={`${inputClass} max-w-xs`}
                      value={editListName}
                      onChange={(e) => setEditListName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="font-medium text-zinc-200">{l.name}</span>
                  )}
                  <span className="text-sm text-zinc-500">id {l.id}</span>
                </label>
                {editingListId === l.id ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => void saveListEdit(l.id)}
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={cancelListEdit}
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => startListEdit(l.id, l.name)}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className={btnDangerSm}
                      onClick={() => deleteList(l.id, l.name)}
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-100">
          Адреса в списке
        </h2>
        {selected ? (
          <>
            <p className="mb-1 text-sm text-zinc-500">
              Активный список:{" "}
              <strong className="text-zinc-200">{selected.name}</strong>
            </p>
            <p className="mb-3 text-xs text-zinc-500">
              По одной записи в строке. Формат: Организация | email.
            </p>
            <textarea
              className={`${inputClass} mb-3 min-h-[10rem] resize-y font-mono text-xs`}
              rows={8}
              placeholder={"Organization A | contact_a_at_domain\nOrganization B | contact_b_at_domain"}
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
            />
            <button
              type="button"
              className={btnSecondary}
              onClick={addRecipientsBulk}
            >
              Добавить адреса
            </button>

            <div className="mt-8 border-t border-zinc-800 pt-6">
              <h3 className="mb-3 text-sm font-semibold text-zinc-200">
                Текущие адреса в списке
              </h3>
              {recipientsLoading ? (
                <p className="text-sm text-zinc-500">Загрузка адресов…</p>
              ) : recipients.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Пока нет адресов — добавьте их выше.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full min-w-[320px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/80 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        <th className="px-3 py-2">Организация</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {recipients.map((r) => (
                        <tr key={r.id} className="text-zinc-200">
                          <td className="px-3 py-2 align-middle">
                            {editingId === r.id ? (
                              <input
                                className={`${inputClass} text-xs`}
                                value={editOrganization}
                                onChange={(e) =>
                                  setEditOrganization(e.target.value)
                                }
                                autoFocus
                              />
                            ) : (
                              <span className="text-xs">
                                {r.organization || "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            {editingId === r.id ? (
                              <input
                                className={`${inputClass} font-mono text-xs`}
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                              />
                            ) : (
                              <span className="font-mono text-xs">
                                {r.email}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right align-middle">
                            {editingId === r.id ? (
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  className={btnSecondary}
                                  onClick={() => void saveEdit(r.id)}
                                >
                                  Сохранить
                                </button>
                                <button
                                  type="button"
                                  className={btnSecondary}
                                  onClick={cancelEdit}
                                >
                                  Отмена
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  className={btnSecondary}
                                  onClick={() => startEdit(r)}
                                >
                                  Изменить
                                </button>
                                <button
                                  type="button"
                                  className={btnDangerSm}
                                  onClick={() =>
                                    void deleteRecipient(r.id, r.email)
                                  }
                                >
                                  Удалить
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Выберите список выше или создайте новый.
          </p>
        )}
      </section>
    </div>
  );
}
