"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiClient, cn, formatCurrency, getStatusColor } from "@/lib/utils";
import { Brain, Heart, Wrench, Fuel, Truck, AlertTriangle, TrendingUp, TrendingDown, Minus, Gauge, Shield, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function AIInsightsPage() {
  const [health, setHealth] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [fuelPred, setFuelPred] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("health");

  useEffect(() => {
    Promise.all([
      apiClient("/ai/fleet-health"),
      apiClient("/ai/maintenance-prediction"),
      apiClient("/ai/fuel-prediction"),
    ]).then(([h, m, f]) => { setHealth(h); setMaintenance(m); setFuelPred(f); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { id: "health", label: "Fleet Health", icon: Heart },
    { id: "maintenance", label: "Maintenance AI", icon: Wrench },
    { id: "fuel", label: "Fuel Prediction", icon: Fuel },
  ];

  const getGradeColor = (grade: string) => {
    return grade === "A" ? "text-emerald-500 bg-emerald-500/10" : grade === "B" ? "text-blue-500 bg-blue-500/10" : grade === "C" ? "text-amber-500 bg-amber-500/10" : "text-red-500 bg-red-500/10";
  };

  const getScoreColor = (score: number) => score >= 80 ? "#10b981" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[rgb(var(--secondary))] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 bg-[rgb(var(--card))] rounded-2xl animate-pulse border border-[rgb(var(--border))]" />)}</div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center"><Brain className="w-5 h-5 text-white" /></div>
            AI Insights
          </h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">AI-powered fleet intelligence & predictions</p>
        </div>
        <div className="flex items-center gap-1 bg-[rgb(var(--secondary))] rounded-xl p-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors",
                activeTab === t.id ? "bg-indigo-500 text-white" : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]")}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Fleet Health Tab */}
      {activeTab === "health" && health && (
        <>
          {/* Overall Score */}
          <motion.div variants={item} className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> Overall Fleet Health</h3>
                <p className="text-5xl font-bold" style={{ color: getScoreColor(health.overallHealth) }}>{health.overallHealth}<span className="text-lg text-[rgb(var(--muted-foreground))]">/100</span></p>
                <p className="text-sm text-[rgb(var(--muted-foreground))] mt-1">
                  {health.overallHealth >= 80 ? "Excellent fleet condition" : health.overallHealth >= 60 ? "Good, some attention needed" : "Needs immediate attention"}
                </p>
              </div>
              <div className="w-32 h-32 relative">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgb(var(--border))" strokeWidth="3" />
                  <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={getScoreColor(health.overallHealth)} strokeWidth="3"
                    strokeDasharray={`${health.overallHealth}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{health.overallHealth}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Vehicle Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {health.vehicles.map((v: any) => (
              <motion.div key={v.vehicleId} variants={item}
                className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">{v.registrationNumber}</p>
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">{v.model}</p>
                  </div>
                  <div className={cn("px-2.5 py-1 rounded-lg text-xs font-bold", getGradeColor(v.grade))}>Grade {v.grade}</div>
                </div>
                {/* Health bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[rgb(var(--muted-foreground))]">Health Score</span>
                    <span className="font-semibold" style={{ color: getScoreColor(v.healthScore) }}>{v.healthScore}%</span>
                  </div>
                  <div className="w-full h-2 bg-[rgb(var(--secondary))] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${v.healthScore}%`, backgroundColor: getScoreColor(v.healthScore) }} />
                  </div>
                </div>
                {/* Issues */}
                {v.issues.length > 0 && (
                  <div className="space-y-1">
                    {v.issues.map((issue: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs"><AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" /><span className="text-[rgb(var(--muted-foreground))]">{issue}</span></div>
                    ))}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-[rgb(var(--border))]">
                  <span className={cn("px-2 py-0.5 rounded-full text-xs border", getStatusColor(v.status))}>{v.status.replace(/_/g, " ")}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Maintenance Prediction Tab */}
      {activeTab === "maintenance" && (
        <div className="space-y-4">
          <motion.div variants={item} className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Wrench className="w-4 h-4 text-indigo-500" /> Maintenance Urgency</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={maintenance.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground))" }} axisLine={false} />
                <YAxis dataKey="registrationNumber" type="category" tick={{ fontSize: 10, fill: "rgb(var(--muted-foreground))" }} width={100} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="daysUntilService" fill="#6366f1" radius={[0, 4, 4, 0]} name="Days Until Service" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maintenance.map((m: any) => (
              <motion.div key={m.vehicleId} variants={item}
                className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{m.registrationNumber}</p>
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">{m.model}</p>
                  </div>
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(m.urgency))}>{m.urgency}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-[rgb(var(--secondary))] rounded-lg p-2 text-center"><p className="text-lg font-bold">{m.daysUntilService}</p><p className="text-[10px] text-[rgb(var(--muted-foreground))]">Days Left</p></div>
                  <div className="bg-[rgb(var(--secondary))] rounded-lg p-2 text-center"><p className="text-lg font-bold">{m.kmUntilService?.toLocaleString()}</p><p className="text-[10px] text-[rgb(var(--muted-foreground))]">Km Left</p></div>
                </div>
                <p className="text-xs text-indigo-400 mt-3 flex items-center gap-1"><Brain className="w-3 h-3" /> {m.recommendation}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Fuel Prediction Tab */}
      {activeTab === "fuel" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fuelPred.map((f: any) => (
            <motion.div key={f.vehicleId} variants={item}
              className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold">{f.registrationNumber}</p>
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">{f.model}</p>
                </div>
                <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  f.trend === "increasing" ? "bg-red-500/10 text-red-400" : f.trend === "decreasing" ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400")}>
                  {f.trend === "increasing" ? <TrendingUp className="w-3 h-3" /> : f.trend === "decreasing" ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />} {f.trend}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-xs text-[rgb(var(--muted-foreground))]">Avg Consumption</span><span className="text-sm font-semibold">{f.avgMonthlyConsumption} L/mo</span></div>
                <div className="flex justify-between"><span className="text-xs text-[rgb(var(--muted-foreground))]">Avg Cost</span><span className="text-sm font-semibold">{formatCurrency(f.avgMonthlyCost)}/mo</span></div>
                <div className="h-px bg-[rgb(var(--border))]" />
                <div className="flex justify-between"><span className="text-xs text-[rgb(var(--muted-foreground))]">Predicted Next Month</span><span className="text-sm font-bold text-indigo-400">{f.predictedNextMonthConsumption} L</span></div>
                <div className="flex justify-between"><span className="text-xs text-[rgb(var(--muted-foreground))]">Predicted Cost</span><span className="text-sm font-bold text-indigo-400">{formatCurrency(f.predictedNextMonthCost)}</span></div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
