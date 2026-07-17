"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/** Invisible - runs once per page load to capture first-touch UTM/referrer
 * attribution into sessionStorage. See lib/attribution.ts. */
export function AttributionTracker() {
  useEffect(() => {
    captureAttribution();
  }, []);

  return null;
}
