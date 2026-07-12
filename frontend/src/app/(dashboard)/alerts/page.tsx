"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiClient, cn, formatDate } from "@/lib/utils";
import { AlertTriangle, Shield, Truck, Users, Wrench, Calendar, Bell, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function AlertsPage() {
  const [risks, setRisks] = useState<any>(null);
  const [notifications, setNotifications] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"risks" | "notifications">("risks");

  useEffect(() => {
    Promise.all([
      apiClient("/ai/risk-detection"),
      apiClient("/notifications?unreadOnly=false"),
    ]).then(([r, n]) => { setRisks(r); setNotifications(n); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    try {
      await apiClient(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev: any) => ({
        ...prev,
        data: prev.data.map((n: any) => n.id === id ? { ...n, read: true } : n),
        unreadCount: prev.unreadCount - 1,
      }));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await apiClient("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev: any) => ({ ...prev, data: prev.data.map((n: any) => ({ ...n, read: true })), unreadCount: 0 }));
    } catch {}
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="w-5 h-5 text-red-500" />;
      case "high": return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "medium": return <AlertCircle className="w-5 h-5 text-amber-400" />;
      default: return <Clock className="w-5 h-5 text-blue-400" />;
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case "vehicle": return <Truck className="w-4 h-4" />;
      case "driver": return <Users className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case "danger": return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-[rgb(var(--card))] rounded-2xl animate-pulse border border-[rgb(var(--border))]" />)}</div>;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-amber-400" /> Alerts & Risks</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">{risks?.criticalCount || 0} critical • {risks?.totalRisks || 0} total risks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[rgb(var(--secondary))] rounded-xl p-1">
            <button onClick={() => setActiveTab("risks")} className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-colors", activeTab === "risks" ? "bg-indigo-500 text-white" : "text-[rgb(var(--muted-foreground))]")}>
              AI Risks ({risks?.totalRisks || 0})
            </button>
            <button onClick={() => setActiveTab("notifications")} className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-colors", activeTab === "notifications" ? "bg-indigo-500 text-white" : "text-[rgb(var(--muted-foreground))]")}>
              Notifications ({notifications?.unreadCount || 0})
            </button>
          </div>
          {activeTab === "notifications" && notifications?.unreadCount > 0 && (
            <button onClick={markAllRead} className="px-3 py-1.5 text-xs bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20">Mark all read</button>
          )}
        </div>
      </motion.div>

      {/* Summary Cards */}
      {activeTab === "risks" && risks && (
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Critical", count: risks.risks.filter((r: any) => r.severity === "critical").length, color: "text-red-500", bg: "bg-red-500/10" },
            { label: "High", count: risks.risks.filter((r: any) => r.severity === "high").length, color: "text-orange-500", bg: "bg-orange-500/10" },
            { label: "Medium", count: risks.risks.filter((r: any) => r.severity === "medium").length, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Total Risks", count: risks.totalRisks, color: "text-indigo-500", bg: "bg-indigo-500/10" },
          ].map(s => (
            <div key={s.label} className="stat-card bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5">
              <p className="text-xs text-[rgb(var(--muted-foreground))] uppercase tracking-wider">{s.label}</p>
              <p className={cn("text-3xl font-bold mt-1", s.color)}>{s.count}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Risk List */}
      {activeTab === "risks" && risks && (
        <div className="space-y-3">
          {risks.risks.map((risk: any, i: number) => (
            <motion.div key={i} variants={item}
              className={cn("bg-[rgb(var(--card))] rounded-2xl border p-5 flex items-start gap-4 hover:shadow-lg transition-shadow",
                risk.severity === "critical" ? "border-red-500/30" : risk.severity === "high" ? "border-orange-500/20" : "border-[rgb(var(--border))]")}>
              {getSeverityIcon(risk.severity)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold">{risk.title}</h3>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium uppercase", 
                    risk.severity === "critical" ? "bg-red-500/10 text-red-500" : risk.severity === "high" ? "bg-orange-500/10 text-orange-500" : "bg-amber-500/10 text-amber-400")}>{risk.severity}</span>
                </div>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">{risk.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {getEntityIcon(risk.entity)}
                  <span className="text-xs text-[rgb(var(--muted-foreground))] capitalize">{risk.type.replace(/_/g, " ")}</span>
                </div>
              </div>
            </motion.div>
          ))}
          {risks.risks.length === 0 && (
            <div className="text-center py-16"><CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 opacity-30" /><p className="text-lg font-semibold text-emerald-500">All Clear!</p><p className="text-sm text-[rgb(var(--muted-foreground))]">No risks detected.</p></div>
          )}
        </div>
      )}

      {/* Notifications */}
      {activeTab === "notifications" && notifications && (
        <div className="space-y-2">
          {notifications.data.map((n: any) => (
            <motion.div key={n.id} variants={item}
              onClick={() => !n.read && markRead(n.id)}
              className={cn("bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-all",
                !n.read && "border-l-4 border-l-indigo-500")}>
              {getNotifIcon(n.type)}
              <div className="flex-1">
                <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium")}>{n.title}</p>
                <p className="text-xs text-[rgb(var(--muted-foreground))] mt-0.5">{n.message}</p>
                <p className="text-[10px] text-[rgb(var(--muted-foreground))] mt-1">{formatDate(n.createdAt)}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
