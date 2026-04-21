"use client";

import { DashboardNav } from "@/components/DashboardNav";
import { FlashMessage } from "@/components/FlashMessage";
import { MailingProvider } from "@/components/MailingContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MailingProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="w-full shrink-0 border-b border-zinc-800 bg-zinc-900 md:w-60 md:border-b-0 md:border-r">
          <DashboardNav />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <FlashMessage />
          <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-7 md:px-8 md:py-8">
            {children}
          </div>
        </div>
      </div>
    </MailingProvider>
  );
}
