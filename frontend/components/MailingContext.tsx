"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, getToken, setToken } from "@/lib/api";

export type Me = { username: string; role: string };
export type ListRow = { id: number; name: string };

type Ctx = {
  me: Me | null;
  lists: ListRow[];
  loading: boolean;
  selectedListId: number | null;
  setSelectedListId: (id: number | null) => void;
  refresh: () => Promise<void>;
  logout: () => void;
  flash: string | null;
  setFlash: (s: string | null) => void;
};

const MailingContext = createContext<Ctx | null>(null);

export function useMailing() {
  const c = useContext(MailingContext);
  if (!c) throw new Error("useMailing только внутри MailingProvider");
  return c;
}

export function MailingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setLists([]);
      setLoading(false);
      return;
    }
    const r = await apiFetch("/me");
    if (r.status === 401) {
      setToken(null);
      setMe(null);
      setLists([]);
      setLoading(false);
      router.replace("/login");
      return;
    }
    setMe(await r.json());
    const lr = await apiFetch("/mailing-lists");
    if (lr.ok) {
      const data = await lr.json();
      setLists(data);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    refresh();
  }, [pathname, refresh, router]);

  useEffect(() => {
    if (lists.length && selectedListId == null) {
      setSelectedListId(lists[0].id);
    }
    if (lists.length && selectedListId != null) {
      const exists = lists.some((l) => l.id === selectedListId);
      if (!exists) setSelectedListId(lists[0]?.id ?? null);
    }
  }, [lists, selectedListId]);

  function logout() {
    setToken(null);
    setMe(null);
    setLists([]);
    router.replace("/login");
  }

  const value: Ctx = {
    me,
    lists,
    loading,
    selectedListId,
    setSelectedListId,
    refresh,
    logout,
    flash,
    setFlash,
  };

  return (
    <MailingContext.Provider value={value}>{children}</MailingContext.Provider>
  );
}
