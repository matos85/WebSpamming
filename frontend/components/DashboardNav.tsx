"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMailing } from "@/components/MailingContext";
import { cn } from "@/lib/cn";

const items = [
  { href: "/dashboard", label: "Главная" },
  { href: "/dashboard/lists", label: "Списки и адреса" },
  { href: "/dashboard/send", label: "Отправка" },
  { href: "/dashboard/data", label: "Мои данные" },
];

const linkBase =
  "block rounded-lg px-3 py-2.5 text-sm text-zinc-200 no-underline transition-colors hover:bg-zinc-800/80";
const linkActive = "bg-sky-950/80 text-sky-400 hover:bg-sky-950";

export function DashboardNav() {
  const pathname = usePathname();
  const { me, logout } = useMailing();

  return (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="mb-6 px-2 text-lg font-bold tracking-tight text-zinc-50">
        WebSpamming
      </div>
      <nav className="flex flex-1 flex-col gap-1 max-md:flex-row max-md:flex-wrap">
        {items.map(({ href, label }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(linkBase, active && linkActive)}
            >
              {label}
            </Link>
          );
        })}
        {me?.role === "admin" && (
          <Link
            href="/dashboard/admin"
            className={cn(
              linkBase,
              pathname.startsWith("/dashboard/admin") && linkActive,
            )}
          >
            Администрирование
          </Link>
        )}
      </nav>
      <div className="mt-auto border-t border-zinc-800 pt-4 max-md:flex max-md:items-center max-md:gap-3 max-md:border-t-0 max-md:pt-2">
        {me && (
          <div className="px-2 pb-3 text-xs max-md:pb-0">
            <span className="block font-semibold text-zinc-100">
              {me.username}
            </span>
            <span className="text-[0.65rem] uppercase tracking-wider text-zinc-500">
              {me.role}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-lg border border-zinc-600 bg-transparent px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-800 max-md:w-auto"
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
