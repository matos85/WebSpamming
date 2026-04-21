"use client";

import Link from "next/link";
import { useMailing } from "@/components/MailingContext";
import { cn } from "@/lib/cn";

const cardClass =
  "group block rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 no-underline transition-colors hover:border-zinc-600 hover:bg-zinc-900";

export default function DashboardHomePage() {
  const { me, lists, loading } = useMailing();

  if (loading || !me) {
    return <p className="text-zinc-500">Загрузка…</p>;
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-50">
        Главная
      </h1>
      <p className="mb-8 max-w-xl text-sm leading-relaxed text-zinc-400">
        Разделы вынесены в меню слева. Кратко: списки и адреса → отправка писем
        → при необходимости очистка данных.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/lists" className={cardClass}>
          <h2 className="mb-2 text-base font-semibold text-zinc-100">
            Списки и адреса
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            Создать список рассылки, добавить email-адреса (по одному в строке
            или через запятую).
          </p>
          <span className="text-xs text-zinc-500">
            Списков:{" "}
            <strong className="text-zinc-300">{lists.length}</strong>
          </span>
        </Link>
        <Link href="/dashboard/send" className={cardClass}>
          <h2 className="mb-2 text-base font-semibold text-zinc-100">
            Отправка
          </h2>
          <p className="text-sm text-zinc-500">
            Тема, текст и опционально HTML — отправка выбранному списку.
          </p>
        </Link>
        <Link href="/dashboard/data" className={cardClass}>
          <h2 className="mb-2 text-base font-semibold text-zinc-100">
            Мои данные
          </h2>
          <p className="text-sm text-zinc-500">
            Удаление своих списков, истории отправок или всего сразу.
          </p>
        </Link>
        {me.role === "admin" && (
          <Link
            href="/dashboard/admin"
            className={cn(cardClass, "border-zinc-700")}
          >
            <h2 className="mb-2 text-base font-semibold text-zinc-100">
              Администрирование
            </h2>
            <p className="text-sm text-zinc-500">
              Создание пользователей и глобальная очистка данных.
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}
