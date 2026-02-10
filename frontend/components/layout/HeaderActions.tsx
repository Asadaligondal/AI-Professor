"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/lib/api";
import { Crown } from "lucide-react";

export default function HeaderActions() {
  const { user, signOut } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.uid],
    queryFn: () => dashboardService.getStats(user!.uid),
    enabled: !!user,
    staleTime: 30000,
  });

  useEffect(() => {
    console.log("HeaderActions mounted");
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Credits:</span>
          <span className="text-xs font-bold text-blue-900 dark:text-blue-100">{stats?.credits || 0}</span>
        </div>
        <div className="px-2.5 py-1 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 rounded border border-amber-200 dark:border-amber-800">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{stats?.current_plan || "Free"} Plan</span>
        </div>
      </div>

      <Button onClick={() => window.location.assign('/pricing')} className="hidden md:flex h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700" size="sm">
        <Crown className="mr-1.5 h-3.5 w-3.5" />
        Upgrade
      </Button>

      <span className="hidden lg:flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded">
        {user?.email}
      </span>

      <Button variant="ghost" size="sm" onClick={signOut} className="h-8 text-xs">
        Sign Out
      </Button>
    </div>
  );
}
