"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiClient, formatCurrency, formatDate, getStatusColor, getStatusLabel, daysUntil } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import {
  Truck, Users, Map, Wrench, Fuel, TrendingUp, TrendingDown, DollarSign,
  Activity, AlertTriangle, Clock, CheckCircle2, XCircle, PauseCircle,
  BarChart3, Star, ChevronRight, Gauge
} from "lucide-react";
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface DashboardStats {
  vehicles: { total: number; active: number; available: number; inShop: number; retired: number };
  drivers: { total: number; available: number; onTrip: number };
  trips: { today: number; pending: number; completed: number; total: number };
  financial: { totalExpenses: number; monthlyExpenses: number; fuelCost: number; totalRevenue: number; monthlyRevenue: number; roi: string };
  fleet: { utilization: string; maintenanceDue: number; tripSuccessRate: string; avgFuelEfficiency: string };
  upcoming: { licenseExpiry: any[]; insuranceExpiry: any[]; maintenance: any[] };
  recentActivities: any[];
}

interface ChartData {
  monthlyTrips: any[];
  expensesByCategory: any[];
  vehicleStatus: any[];
  topDrivers: any[];
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number | string; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = numValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numValue) { setDisplay(numValue); clearInterval(timer); }
      else setDisplay(current);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [numValue]);
  return <span>{prefix}{typeof value === "string" ? display.toFixed(1) : Math.round(display).toLocaleString("en-IN")}{suffix}</span>;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient("/dashboard/stats"),
      apiClient("/dashboard/charts"),
    ]).then(([s, c]) => { setStats(s); setCharts(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats || !charts) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-[rgb(var(--secondary))] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 bg-[rgb(var(--card))] rounded-2xl animate-pulse border border-[rgb(var(--border))]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 bg-[rgb(var(--card))] rounded-2xl animate-pulse border border-[rgb(var(--border))]" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Active Vehicles", value: stats.vehicles.active, icon: Truck, gradient: "gradient-primary", change: `${stats.vehicles.total} total` },
    { label: "Available Vehicles", value: stats.vehicles.available, icon: CheckCircle2, gradient: "gradient-success", change: `${stats.vehicles.inShop} in shop` },
    { label: "Trips Today", value: stats.trips.today, icon: Map, gradient: "gradient-info", change: `${stats.trips.pending} pending` },
    { label: "Drivers Available", value: stats.drivers.available, icon: Users, gradient: "gradient-primary", change: `${stats.drivers.onTrip} on trip` },
    { label: "Fleet Utilization", value: stats.fleet.utilization, icon: Gauge, gradient: "gradient-success", change: "active / total", suffix: "%" },
    { label: "Maintenance Due", value: stats.fleet.maintenanceDue, icon: Wrench, gradient: "gradient-warning", change: "next 7 days" },
    { label: "Fuel Cost (Month)", value: stats.financial.fuelCost, icon: Fuel, gradient: "gradient-danger", isCurrency: true },
    { label: "Monthly Revenue", value: stats.financial.monthlyRevenue, icon: DollarSign, gradient: "gradient-success", isCurrency: true },
  ];

  const COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-[rgb(var(--muted-foreground))] text-sm mt-1">Here&apos;s your fleet overview for today</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 font-medium">{user?.role?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
          <span className="text-xs text-[rgb(var(--muted-foreground))]">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.label} variants={item}
            className="stat-card bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold">
                  {card.isCurrency ? formatCurrency(card.value as number) : <AnimatedCounter value={card.value} suffix={card.suffix} />}
                </p>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">{card.change}</p>
              </div>
              <div className={`w-11 h-11 ${card.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trip Trends */}
        <motion.div variants={item} className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" /> Trip Trends
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={charts.monthlyTrips}>
              <defs>
                <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="completed" stroke="#6366f1" fill="url(#colorTrips)" strokeWidth={2} name="Completed" />
              <Area type="monotone" dataKey="total" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} name="Total" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Vehicle Status Pie */}
        <motion.div variants={item} className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-500" /> Vehicle Status
          </h3>
          <div className="flex items-center justify-center gap-8">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={charts.vehicleStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="count" animationDuration={800}>
                  {charts.vehicleStatus.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {charts.vehicleStatus.map((s: any) => (
                <div key={s.status} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-[rgb(var(--muted-foreground))]">{s.status}</span>
                  <span className="text-sm font-semibold ml-auto">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Expense Breakdown */}
        <motion.div variants={item} className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-500" /> Expense Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.expensesByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: "rgb(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                tickFormatter={(v: string) => v.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()).substring(0, 10)} />
              <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Driver Leaderboard */}
        <motion.div variants={item} className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> Driver Leaderboard
          </h3>
          <div className="space-y-3">
            {charts.topDrivers.slice(0, 6).map((driver: any, i: number) => (
              <div key={driver.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[rgb(var(--secondary))] transition-colors">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "gradient-primary text-white" : "bg-[rgb(var(--secondary))] text-[rgb(var(--muted-foreground))]"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{driver.name}</p>
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">{driver.totalTrips} trips • {driver.totalDistance?.toLocaleString()} km</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold">{driver.performanceRating}</span>
                  </div>
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">Safety: {driver.safetyScore}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ROI & Financial Summary */}
        <motion.div variants={item} className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Financial Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[rgb(var(--muted-foreground))]">Total Revenue</span>
              <span className="text-sm font-semibold text-emerald-500">{formatCurrency(stats.financial.totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[rgb(var(--muted-foreground))]">Total Expenses</span>
              <span className="text-sm font-semibold text-red-400">{formatCurrency(stats.financial.totalExpenses)}</span>
            </div>
            <div className="h-px bg-[rgb(var(--border))]" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">ROI</span>
              <span className={`text-lg font-bold ${Number(stats.financial.roi) >= 0 ? "text-emerald-500" : "text-red-400"}`}>{stats.financial.roi}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[rgb(var(--muted-foreground))]">Trip Success Rate</span>
              <span className="text-sm font-semibold">{stats.fleet.tripSuccessRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[rgb(var(--muted-foreground))]">Avg Fuel Efficiency</span>
              <span className="text-sm font-semibold">{stats.fleet.avgFuelEfficiency} km/L</span>
            </div>
          </div>
        </motion.div>

        {/* Upcoming Alerts */}
        <motion.div variants={item} className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Upcoming Alerts
          </h3>
          <div className="space-y-3">
            {stats.upcoming.licenseExpiry.slice(0, 3).map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 p-2 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <Users className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{d.name}</p>
                  <p className="text-[10px] text-amber-400">License expires {formatDate(d.licenseExpiry)}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">{daysUntil(d.licenseExpiry)}d</span>
              </div>
            ))}
            {stats.upcoming.maintenance.slice(0, 3).map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <Wrench className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{m.vehicle?.registrationNumber}</p>
                  <p className="text-[10px] text-blue-400">{m.description}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{formatDate(m.scheduledDate)}</span>
              </div>
            ))}
            {stats.upcoming.licenseExpiry.length === 0 && stats.upcoming.maintenance.length === 0 && (
              <p className="text-center text-sm text-[rgb(var(--muted-foreground))] py-4">No upcoming alerts</p>
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={item} className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" /> Recent Activity
          </h3>
          <div className="space-y-3">
            {stats.recentActivities.slice(0, 6).map((a: any, i: number) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs"><span className="font-medium">{a.user?.name}</span> <span className="text-[rgb(var(--muted-foreground))]">{a.action}</span> <span className="font-medium">{a.entityType}</span></p>
                  <p className="text-[10px] text-[rgb(var(--muted-foreground))]">{formatDate(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
