"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { cn, getInitials } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Truck, Users, Map, Wrench, Fuel, Receipt, FileBarChart,
  Bell, Settings, LogOut, ChevronLeft, ChevronRight, Search, Moon, Sun,
  Brain, AlertTriangle, Menu, X, Command
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "Fleet",
    items: [
      { href: "/vehicles", icon: Truck, label: "Vehicles" },
      { href: "/drivers", icon: Users, label: "Drivers" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/trips", icon: Map, label: "Trips" },
      { href: "/maintenance", icon: Wrench, label: "Maintenance" },
      { href: "/fuel", icon: Fuel, label: "Fuel" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/expenses", icon: Receipt, label: "Expenses" },
      { href: "/reports", icon: FileBarChart, label: "Reports" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/ai-insights", icon: Brain, label: "AI Insights" },
      { href: "/alerts", icon: AlertTriangle, label: "Alerts" },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loadUser, isLoading } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [cmdSearch, setCmdSearch] = useState("");

  useEffect(() => {
    loadUser().then(() => {
      if (!localStorage.getItem("token")) router.replace("/login");
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === "Escape") setShowCommandPalette(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading TransitOps...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const allNavItems = navGroups.flatMap(g => g.items);
  const filteredCmd = cmdSearch
    ? allNavItems.filter(i => i.label.toLowerCase().includes(cmdSearch.toLowerCase()))
    : allNavItems;

  const roleLabel = user.role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:relative z-50 h-full flex flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--card))] transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[280px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className={cn("flex items-center h-16 px-4 border-b border-[rgb(var(--border))]", collapsed ? "justify-center" : "gap-3")}>
          <div className="w-9 h-9 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
              <h1 className="font-bold text-sm">TransitOps</h1>
              <p className="text-[10px] text-[rgb(var(--muted-foreground))]">Transport Platform</p>
            </motion.div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))] px-3 mb-2">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group",
                        isActive
                          ? "bg-indigo-500/10 text-indigo-500"
                          : "text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--secondary))] hover:text-[rgb(var(--foreground))]",
                        collapsed && "justify-center px-2"
                      )}>
                      {isActive && (
                        <motion.div layoutId="activeNav"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full"
                        />
                      )}
                      <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-indigo-500")} />
                      {!collapsed && <span>{item.label}</span>}
                      {collapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-[rgb(var(--popover))] border border-[rgb(var(--border))] rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-[rgb(var(--border))]">
          <div className={cn("flex items-center gap-3 p-2 rounded-xl hover:bg-[rgb(var(--secondary))] transition-colors", collapsed && "justify-center")}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {getInitials(user.name)}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-[10px] text-[rgb(var(--muted-foreground))] truncate">{roleLabel}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-2 mt-1 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-full items-center justify-center text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors shadow-sm">
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))/0.8] backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 hover:bg-[rgb(var(--secondary))] rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            {/* Search / Command Palette trigger */}
            <button onClick={() => setShowCommandPalette(true)}
              className="hidden sm:flex items-center gap-3 px-4 py-2 bg-[rgb(var(--secondary))] rounded-xl text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors w-64">
              <Search className="w-4 h-4" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="text-[10px] px-1.5 py-0.5 bg-[rgb(var(--background))] rounded border border-[rgb(var(--border))] font-mono">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-[rgb(var(--secondary))] rounded-xl transition-colors">
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
            {/* Notifications */}
            <Link href="/alerts"
              className="relative p-2 hover:bg-[rgb(var(--secondary))] rounded-xl transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
            {/* User avatar (mobile) */}
            <div className="lg:hidden w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
              {getInitials(user.name)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <AnimatePresence>
        {showCommandPalette && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" onClick={() => setShowCommandPalette(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[101]">
              <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgb(var(--border))]">
                  <Command className="w-5 h-5 text-[rgb(var(--muted-foreground))]" />
                  <input autoFocus value={cmdSearch} onChange={(e) => setCmdSearch(e.target.value)}
                    placeholder="Type a command or search..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-[rgb(var(--muted-foreground))]" />
                  <kbd className="text-[10px] px-1.5 py-0.5 bg-[rgb(var(--secondary))] rounded border border-[rgb(var(--border))] font-mono">ESC</kbd>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {filteredCmd.map((item) => (
                    <button key={item.href} onClick={() => { router.push(item.href); setShowCommandPalette(false); setCmdSearch(""); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm hover:bg-[rgb(var(--secondary))] transition-colors text-left">
                      <item.icon className="w-4 h-4 text-[rgb(var(--muted-foreground))]" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                  {filteredCmd.length === 0 && (
                    <p className="text-center text-sm text-[rgb(var(--muted-foreground))] py-8">No results found</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
