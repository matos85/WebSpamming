"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  btnDanger,
  btnDangerSm,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "@/lib/ui";
import { useMailing } from "@/components/MailingContext";

type UserRow = {
  id: number;
  username: string;
  role: string;
  created_at: string;
};

type SmtpSettings = {
  host: string;
  port: number;
  username: string;
  has_password: boolean;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  use_ssl: boolean;
  allow_html_body: boolean;
};

type AdminTab = "users" | "create" | "smtp" | "cleanup";

const TABS: AdminTab[] = ["users", "create", "smtp", "cleanup"];

function asAdminTab(v: string | null): AdminTab {
  return TABS.includes((v ?? "") as AdminTab) ? (v as AdminTab) : "users";
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Загрузка…</p>}>
      <AdminPageInner />
    </Suspense>
  );
}

function AdminPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { me, loading, refresh, setFlash } = useMailing();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [smtpLoading, setSmtpLoading] = useState(true);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtp, setSmtp] = useState<SmtpSettings>({
    host: "",
    port: 587,
    username: "",
    has_password: false,
    from_email: "",
    from_name: "WebSpamming",
    use_tls: true,
    use_ssl: false,
    allow_html_body: true,
  });
  const [smtpPassword, setSmtpPassword] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const r = await apiFetch("/admin/users");
    if (!r.ok) {
      setFlash(await r.text());
      setUsers([]);
    } else {
      setUsers(await r.json());
    }
    setUsersLoading(false);
  }, [setFlash]);

  const loadSmtp = useCallback(async () => {
    setSmtpLoading(true);
    const r = await apiFetch("/admin/smtp-settings");
    if (!r.ok) {
      setFlash(await r.text());
      setSmtpLoading(false);
      return;
    }
    const data = (await r.json()) as SmtpSettings;
    setSmtp(data);
    setSmtpPassword("");
    setSmtpLoading(false);
  }, [setFlash]);

  useEffect(() => {
    if (!loading && me?.role === "admin") {
      loadUsers();
      loadSmtp();
    }
  }, [loading, me?.role, loadUsers, loadSmtp]);

  useEffect(() => {
    const tabFromUrl = asAdminTab(searchParams.get("tab"));
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  function setTab(tab: AdminTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  }

  if (loading || !me) {
    return <p className="text-zinc-500">Загрузка…</p>;
  }

  if (me.role !== "admin") {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold text-zinc-50">
          Доступ запрещён
        </h1>
        <p className="text-sm text-zinc-500">
          Эта страница только для администратора.
        </p>
      </div>
    );
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setFlash(null);
    const res = await apiFetch("/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFlash(
        typeof data.detail === "string" ? data.detail : JSON.stringify(data),
      );
      return;
    }
    setNewUsername("");
    setNewPassword("");
    setNewRole("user");
    setFlash(`Пользователь создан: ${data.username}`);
    await refresh();
    await loadUsers();
  }

  async function changeRole(userId: number, role: "user" | "admin") {
    setFlash(null);
    const res = await apiFetch(`/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFlash(
        typeof data.detail === "string" ? data.detail : JSON.stringify(data),
      );
      await loadUsers();
      return;
    }
    setFlash(`Роль обновлена: ${data.username} → ${data.role}`);
    await refresh();
    await loadUsers();
  }

  async function resetPassword(userId: number) {
    const pw = prompt("Новый пароль (не менее 4 символов)");
    if (pw == null) return;
    if (pw.length < 4) {
      setFlash("Пароль слишком короткий");
      return;
    }
    setFlash(null);
    const res = await apiFetch(`/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFlash(
        typeof data.detail === "string" ? data.detail : JSON.stringify(data),
      );
      return;
    }
    setFlash(`Пароль изменён для ${data.username}`);
    await loadUsers();
  }

  async function deleteUser(userId: number, username: string) {
    if (!confirm(`Удалить пользователя «${username}»? Данные и списки будут удалены.`))
      return;
    setFlash(null);
    const res = await apiFetch(`/admin/users/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFlash(
        typeof data.detail === "string" ? data.detail : await res.text(),
      );
      await loadUsers();
      return;
    }
    setFlash(`Удалён: ${username}`);
    await refresh();
    await loadUsers();
  }

  async function cleanupAdmin(action: string) {
    let confirmToken: string | undefined;
    if (action !== "global_send_logs_only") {
      const p = prompt('Введите DELETE для подтверждения');
      if (p !== "DELETE") {
        setFlash("Отмена");
        return;
      }
      confirmToken = "DELETE";
    }
    setFlash(null);
    const res = await apiFetch("/cleanup/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, confirm: confirmToken }),
    });
    setFlash(await res.text());
    await refresh();
    await loadUsers();
  }

  async function saveSmtp(e: FormEvent) {
    e.preventDefault();
    setFlash(null);
    setSmtpSaving(true);
    const res = await apiFetch("/admin/smtp-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: smtp.host.trim(),
        port: Number(smtp.port) || 587,
        username: smtp.username.trim(),
        password: smtpPassword.length > 0 ? smtpPassword : null,
        from_email: smtp.from_email.trim(),
        from_name: smtp.from_name.trim(),
        use_tls: smtp.use_tls,
        use_ssl: smtp.use_ssl,
        allow_html_body: smtp.allow_html_body,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFlash(
        typeof data.detail === "string" ? data.detail : JSON.stringify(data),
      );
      setSmtpSaving(false);
      return;
    }
    setSmtp(data as SmtpSettings);
    setSmtpPassword("");
    setSmtpSaving(false);
    setFlash("SMTP-настройки сохранены.");
  }

  async function testSmtp() {
    setFlash(null);
    setSmtpTesting(true);
    const res = await apiFetch("/admin/smtp-settings/test", {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFlash(
        typeof data.detail === "string" ? data.detail : JSON.stringify(data),
      );
      setSmtpTesting(false);
      return;
    }
    setFlash(
      typeof data.message === "string"
        ? data.message
        : "SMTP проверка успешно пройдена.",
    );
    setSmtpTesting(false);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-50">
        Администрирование
      </h1>
      <p className="mb-8 max-w-xl text-sm text-zinc-400">
        Управление пользователями, создание учётных записей и глобальная
        очистка.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          className={`${btnSecondary} ${
            activeTab === "users" ? "border-sky-600 text-sky-300" : ""
          }`}
          onClick={() => setTab("users")}
        >
          Пользователи
        </button>
        <button
          type="button"
          className={`${btnSecondary} ${
            activeTab === "create" ? "border-sky-600 text-sky-300" : ""
          }`}
          onClick={() => setTab("create")}
        >
          Новый пользователь
        </button>
        <button
          type="button"
          className={`${btnSecondary} ${
            activeTab === "smtp" ? "border-sky-600 text-sky-300" : ""
          }`}
          onClick={() => setTab("smtp")}
        >
          SMTP
        </button>
        <button
          type="button"
          className={`${btnSecondary} ${
            activeTab === "cleanup" ? "border-sky-600 text-sky-300" : ""
          }`}
          onClick={() => setTab("cleanup")}
        >
          Очистка
        </button>
      </div>

      {activeTab === "users" && (
        <section className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-100">
            Пользователи
          </h2>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => loadUsers()}
          >
            Обновить список
          </button>
        </div>
        {usersLoading ? (
          <p className="text-sm text-zinc-500">Загрузка списка…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-zinc-500">Нет пользователей.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50">
                  <th className="px-3 py-2.5 font-medium text-zinc-400">ID</th>
                  <th className="px-3 py-2.5 font-medium text-zinc-400">
                    Логин
                  </th>
                  <th className="px-3 py-2.5 font-medium text-zinc-400">
                    Роль
                  </th>
                  <th className="px-3 py-2.5 font-medium text-zinc-400">
                    Создан
                  </th>
                  <th className="px-3 py-2.5 font-medium text-zinc-400">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-zinc-800/80 last:border-0"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">
                      {u.id}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-200">
                      {u.username}
                      {u.username === me.username && (
                        <span className="ml-2 text-xs font-normal text-sky-500">
                          (вы)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        className={`${inputClass} max-w-[140px] py-1.5 text-xs`}
                        value={u.role}
                        onChange={(e) =>
                          changeRole(
                            u.id,
                            e.target.value as "user" | "admin",
                          )
                        }
                      >
                        <option value="user" className="bg-zinc-900">
                          user
                        </option>
                        <option value="admin" className="bg-zinc-900">
                          admin
                        </option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-500">
                      {new Date(u.created_at).toLocaleString("ru-RU")}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={`${btnSecondary} py-1.5 text-xs`}
                          onClick={() => resetPassword(u.id)}
                        >
                          Пароль
                        </button>
                        <button
                          type="button"
                          className={btnDangerSm}
                          onClick={() => deleteUser(u.id, u.username)}
                          disabled={u.username === me.username}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {activeTab === "create" && (
        <section className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-100">
          Новый пользователь
        </h2>
        <form
          onSubmit={createUser}
          className="flex max-w-md flex-col gap-4"
        >
          <label>
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">
              Логин
            </span>
            <input
              className={inputClass}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
              minLength={1}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">
              Пароль
            </span>
            <input
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={4}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">
              Роль
            </span>
            <select
              className={inputClass}
              value={newRole}
              onChange={(e) =>
                setNewRole(e.target.value as "user" | "admin")
              }
            >
              <option value="user" className="bg-zinc-900">
                Пользователь
              </option>
              <option value="admin" className="bg-zinc-900">
                Администратор
              </option>
            </select>
          </label>
          <button type="submit" className={`${btnPrimary} w-fit`}>
            Создать пользователя
          </button>
        </form>
      </section>
      )}

      {activeTab === "smtp" && (
        <section className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-100">SMTP</h2>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => loadSmtp()}
          >
            Обновить SMTP
          </button>
        </div>
        {smtpLoading ? (
          <p className="text-sm text-zinc-500">Загрузка SMTP-настроек…</p>
        ) : (
          <form onSubmit={saveSmtp} className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                SMTP host
              </span>
              <input
                className={inputClass}
                value={smtp.host}
                onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                placeholder="m.krasnodar.ru"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                SMTP port
              </span>
              <input
                type="number"
                min={1}
                max={65535}
                className={inputClass}
                value={smtp.port}
                onChange={(e) =>
                  setSmtp({ ...smtp, port: Number(e.target.value) || 587 })
                }
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Логин (SMTP user)
              </span>
              <input
                className={inputClass}
                value={smtp.username}
                onChange={(e) =>
                  setSmtp({ ...smtp, username: e.target.value })
                }
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                Пароль (оставьте пустым, чтобы не менять)
              </span>
              <input
                type="password"
                className={inputClass}
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={smtp.has_password ? "Пароль уже сохранён" : ""}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                From email
              </span>
              <input
                className={inputClass}
                value={smtp.from_email}
                onChange={(e) =>
                  setSmtp({ ...smtp, from_email: e.target.value })
                }
                placeholder="sender_at_domain"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">
                From name
              </span>
              <input
                className={inputClass}
                value={smtp.from_name}
                onChange={(e) =>
                  setSmtp({ ...smtp, from_name: e.target.value })
                }
                placeholder="WebSpamming"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={smtp.use_tls}
                onChange={(e) =>
                  setSmtp({ ...smtp, use_tls: e.target.checked })
                }
              />
              STARTTLS
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={smtp.use_ssl}
                onChange={(e) =>
                  setSmtp({ ...smtp, use_ssl: e.target.checked })
                }
              />
              SSL (порт 465)
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300 md:col-span-2">
              <input
                type="checkbox"
                checked={smtp.allow_html_body}
                onChange={(e) =>
                  setSmtp({ ...smtp, allow_html_body: e.target.checked })
                }
              />
              Разрешить HTML в рассылке
            </label>

            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className={`${btnPrimary} ${smtpSaving ? "opacity-70" : ""}`}
                  disabled={smtpSaving || smtpTesting}
                >
                  {smtpSaving ? "Сохранение…" : "Сохранить SMTP"}
                </button>
                <button
                  type="button"
                  className={`${btnSecondary} ${smtpTesting ? "opacity-70" : ""}`}
                  onClick={() => void testSmtp()}
                  disabled={smtpSaving || smtpTesting}
                >
                  {smtpTesting ? "Проверка…" : "Проверить SMTP"}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
      )}

      {activeTab === "cleanup" && (
        <section className="rounded-xl border border-red-900/30 bg-red-950/10 p-5 md:p-6">
        <h2 className="mb-2 text-base font-semibold text-red-200">
          Глобальная очистка
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          Действия затрагивают всех пользователей системы. Используйте с
          осторожностью.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className={`${btnSecondary} w-fit`}
            onClick={() => cleanupAdmin("global_send_logs_only")}
          >
            Только логи отправок (все)
          </button>
          <button
            type="button"
            className={`${btnDanger} w-fit`}
            onClick={() => cleanupAdmin("global_mailing_data")}
          >
            Все списки, адреса, задания и логи
          </button>
          <button
            type="button"
            className={`${btnDanger} w-fit`}
            onClick={() => cleanupAdmin("non_admin_users")}
          >
            Удалить всех пользователей кроме админов
          </button>
        </div>
      </section>
      )}
    </div>
  );
}
