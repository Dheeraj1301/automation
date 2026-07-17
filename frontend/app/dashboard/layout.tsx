"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { OrgProvider, useOrg } from "@/lib/org-context";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

function WhatsAppVerificationGate({ children }: { children: React.ReactNode }) {
  const { currentOrg, isLoading } = useOrg();
  const router = useRouter();
  const needsVerification = !isLoading && currentOrg && !currentOrg.whatsapp_verified;

  useEffect(() => {
    if (needsVerification) {
      router.replace("/verify-whatsapp");
    }
  }, [needsVerification, router]);

  if (needsVerification) {
    return null;
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/login");
    }
  }, [token, isLoading, router]);

  if (isLoading || !token) {
    return null;
  }

  return (
    <OrgProvider>
      <WhatsAppVerificationGate>
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
          <Sidebar />
          <div className="flex-1">
            <header className="flex items-center justify-end border-b border-gray-200 px-6 py-3 dark:border-gray-800">
              <ThemeToggle />
            </header>
            <main className="p-6">{children}</main>
          </div>
        </div>
      </WhatsAppVerificationGate>
    </OrgProvider>
  );
}
