"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [{ label: "Dashboard", href: "/dashboard" }];

const UPCOMING_NAV_ITEMS = ["Products", "Leads", "Settings"];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 flex-col justify-between border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div>
        <div className="px-6 py-5 text-lg font-semibold text-gray-900 dark:text-gray-100">
          ProfitPilot
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                pathname === item.href
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {UPCOMING_NAV_ITEMS.map((label) => (
            <span
              key={label}
              className="cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-gray-400 dark:text-gray-600"
              title="Coming in a later phase"
            >
              {label}
            </span>
          ))}
        </nav>
      </div>
      <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
        <p className="mb-2 truncate text-sm text-gray-700 dark:text-gray-300">{user?.email}</p>
        <button
          onClick={logout}
          className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
