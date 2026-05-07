"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Shield, BarChart3, Users, Store, DollarSign, Activity, Bell, LogOut, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_CODE = "0902";
const STORAGE_KEY = "umon_admin_auth";

const NAV_ITEMS = [
  { href: "/umon-admin", label: "Overview", icon: BarChart3 },
  { href: "/umon-admin/merchants", label: "Merchants", icon: Store },
  { href: "/umon-admin/users", label: "Users", icon: Users },
  { href: "/umon-admin/fees", label: "Fees", icon: DollarSign },
  { href: "/umon-admin/activity", label: "Activity", icon: Activity },
  { href: "/umon-admin/notifications", label: "Notifications", icon: Bell },
];

export default function AdminLayout({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === "true") setAuthed(true);
    }
  }, []);

  const handleLogin = () => {
    if (code === ADMIN_CODE) {
      setAuthed(true);
      setError(false);
      sessionStorage.setItem(STORAGE_KEY, "true");
    } else {
      setError(true);
      setCode("");
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-xs rounded-2xl bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
            <Lock className="h-7 w-7 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Umon Admin</h1>
          <p className="mt-2 text-sm text-gray-500">Enter access code to continue</p>
          <form
            onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
            className="mt-6"
          >
            <input
              type="password"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(false); }}
              placeholder="Access code"
              autoFocus
              className={`w-full rounded-lg border px-4 py-2.5 text-center text-lg tracking-widest text-gray-900 outline-none transition ${
                error ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              }`}
            />
            {error ? <p className="mt-2 text-xs text-red-500">Incorrect code</p> : null}
            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
          <Shield className="h-6 w-6 text-indigo-600" />
          <span className="text-sm font-bold text-gray-900">Umon Admin</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => { sessionStorage.removeItem(STORAGE_KEY); setAuthed(false); setCode(""); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="ml-56 flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
