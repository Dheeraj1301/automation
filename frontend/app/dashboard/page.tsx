"use client";

import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Welcome{user ? `, ${user.full_name}` : ""}
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        This is your ProfitPilot dashboard. Modules will appear here as they&apos;re built.
      </p>
    </div>
  );
}
