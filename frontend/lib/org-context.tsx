"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api, MyOrganization } from "./api";
import { useAuth } from "./auth-context";

const CURRENT_ORG_KEY = "profitpilot_current_org";

interface OrgContextValue {
  organizations: MyOrganization[];
  currentOrg: MyOrganization | null;
  isLoading: boolean;
  switchOrg: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [organizations, setOrganizations] = useState<MyOrganization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshOrganizations = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const orgs = await api.listOrganizations(token);
      setOrganizations(orgs);
      setCurrentOrgId((prev) => {
        const stored = prev ?? localStorage.getItem(CURRENT_ORG_KEY);
        const stillValid = orgs.some((o) => o.id === stored);
        const next = stillValid ? stored : orgs[0]?.id ?? null;
        if (next) localStorage.setItem(CURRENT_ORG_KEY, next);
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrgId(null);
      setIsLoading(false);
    }
  }, [token, refreshOrganizations]);

  function switchOrg(orgId: string) {
    setCurrentOrgId(orgId);
    localStorage.setItem(CURRENT_ORG_KEY, orgId);
  }

  const currentOrg = organizations.find((o) => o.id === currentOrgId) ?? null;

  return (
    <OrgContext.Provider value={{ organizations, currentOrg, isLoading, switchOrg, refreshOrganizations }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return ctx;
}
