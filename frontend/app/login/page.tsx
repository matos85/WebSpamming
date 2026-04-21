"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch, setToken } from "@/lib/api";
import { inputClass } from "@/lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const body = new URLSearchParams();
    body.set("username", username);
    body.set("password", password);
    const res = await apiFetch("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      setErr("Неверный логин или пароль");
      return;
    }
    const data = await res.json();
    setToken(data.access_token);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-8 text-2xl font-bold text-zinc-50">Вход</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="block text-sm text-zinc-300">
          Логин
          <input
            className={`mt-1 ${inputClass}`}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Пароль
          <input
            type="password"
            className={`mt-1 ${inputClass}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          type="submit"
          className="mt-2 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500"
        >
          Войти
        </button>
      </form>
    </main>
  );
}
