"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { OrgSwitcher } from "@/components/OrgSwitcher";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", exact: true },
  { label: "Products", href: "/dashboard/products", exact: false },
  { label: "Landing Pages", href: "/dashboard/landing-pages", exact: false },
  { label: "Leads", href: "/dashboard/leads", exact: false },
  { label: "Settings", href: "/dashboard/settings", exact: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 flex-col justify-between border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div>
        <div className="px-6 py-5 text-lg font-semibold text-gray-900 dark:text-gray-100">
          ProfitPilot
        </div>
        <OrgSwitcher />
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
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
