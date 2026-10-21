"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser } from "@/lib/api-client";

export default function UserRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((user) => {
        if (!active) return;
        const targetUsername = user?.profile?.username;
        if (targetUsername) {
          router.replace(`/${targetUsername}`);
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        if (active) {
          router.replace("/login");
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 font-mono text-xs">
      <div className="flex items-center space-x-3">
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span>Redirecting to your creator bio page...</span>
      </div>
    </div>
  );
}
