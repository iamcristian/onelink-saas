"use client";

import { useEffect } from "react";
import { getApiBaseUrl } from "@/lib/api-config";

interface PageViewTrackerProps {
  profileId: string;
}

export function PageViewTracker({ profileId }: PageViewTrackerProps) {
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.sendBeacon) {
      try {
        const apiUrl = getApiBaseUrl();
        const payload = JSON.stringify({
          profileId,
          referrer: document.referrer || undefined,
        });
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(`${apiUrl}/api/track/view`, blob);
      } catch {
        // Fire-and-forget telemetry
      }
    }
  }, [profileId]);

  return null;
}
