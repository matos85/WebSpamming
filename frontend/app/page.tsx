"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
        WebSpamming
      </h1>
      <p className="max-w-sm text-sm text-zinc-400">
        Войдите, чтобы перейти к рассылкам и спискам.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-full bg-sky-600 px-8 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-sky-500"
      >
        Войти
      </Link>
    </main>
  );
}
