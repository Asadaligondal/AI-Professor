"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import HeaderActions from "@/components/layout/HeaderActions";
import {
  GraduationCap,
  LayoutDashboard,
  PlusCircle,
  FileSearch,
  BarChart3,
  CreditCard,
  Search,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "New Exam",
    href: "/dashboard/new-exam",
    icon: PlusCircle,
  },
  {
    label: "Classrooms",
    href: "/dashboard/classrooms",
    icon: GraduationCap,
  },
  {
    label: "Review",
    href: "/dashboard/review",
    icon: FileSearch,
  },
  {
    label: "Results",
    href: "/dashboard/results",
    icon: BarChart3,
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
];

export function AppShell({ children, pageTitle = "Dashboard" }: AppShellProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("AppShell mounted");
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200/80 dark:border-zinc-800 flex flex-col shadow-sm">
        {/* Logo Header */}
        <div className="p-6 border-b border-zinc-200/80 dark:border-zinc-800">
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-lg p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                AI Professor
              </h1>
              <p className="text-xs text-zinc-400">
                Exam Grader
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-10 text-sm",
                    isActive
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300 shadow-sm border border-blue-100 dark:border-blue-800/50"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <Icon className={cn("h-4.5 w-4.5", isActive ? "text-blue-600 dark:text-blue-400" : "")} />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-3 text-sm">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.photoURL ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {user?.displayName || user?.email?.split('@')[0] || "User"}
              </p>
              <p className="text-xs text-zinc-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Page Title + Back */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                Back
              </Button>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {pageTitle}
              </h1>
            </div>

            {/* Search and User Menu */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Search..."
                  className="w-64 pl-10 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
                  disabled
                />
              </div>

              {/* Header actions (credits, plan, upgrade, email, sign out) */}
              <HeaderActions />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}