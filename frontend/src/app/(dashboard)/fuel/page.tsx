"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { apiClient, formatCurrency, formatDate, cn } from "@/lib/utils";
import { Fuel, Plus, Search, X, ChevronLeft, ChevronRight, TrendingUp, Droplets } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function FuelPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [tab, setTab] = useState<"logs" | "analytics">("logs");

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [data, analyticsData] = await Promise.all([
        apiClient(`/fuel?page=${page}&limit=10`),
        apiClient("/fuel/analytics/summary"),
      ]);
      setLogs(data.data); setPagination(data.pagination); setAnalytics(analyticsData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      if (!formData.vehicleId || !formData.quantity || !formData.costPerUnit || !formData.odometer) {
        setFormError("Vehicle, quantity, cost per unit, and odometer are required"); setSaving(false); return;
      }
      await apiClient("/fuel", { method: "POST", body: JSON.stringify(formData) });
      setToast({ message: "Fuel log added", type: "success" });
      setShowForm(false); setFormData({}); fetchLogs(pagination.page);
    } catch (err: any) { setFormError(err.message); } finally { setSaving(false); }
  };

  const loadVehicles = async () => { try { const v = await apiClient("/vehicles?limit=100"); setVehicles(v.data || []); } catch {} };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {toast && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={cn("fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium", toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>{toast.message}</motion.div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Fuel className="w-6 h-6 text-indigo-500" /> Fuel Management</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">Track consumption & costs</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-[rgb(var(--secondary))] rounded-xl p-1">
            <button onClick={() => setTab("logs")} className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-colors", tab === "logs" ? "bg-indigo-500 text-white" : "text-[rgb(var(--muted-foreground))]")}>Logs</button>
            <button onClick={() => setTab("analytics")} className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-colors", tab === "analytics" ? "bg-indigo-500 text-white" : "text-[rgb(var(--muted-foreground))]")}>Analytics</button>
          </div>
          <button onClick={() => { setShowForm(true); setFormData({ fuelType: "Diesel" }); loadVehicles(); }}
            className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 shadow-lg shadow-indigo-500/25">
            <Plus className="w-4 h-4" /> Add Log
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5">
            <p className="text-xs text-[rgb(var(--muted-foreground))] uppercase tracking-wider">Total Cost</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(analytics.totalCost)}</p>
          </div>
          <div className="stat-card bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5">
            <p className="text-xs text-[rgb(var(--muted-foreground))] uppercase tracking-wider">Total Quantity</p>
            <p className="text-2xl font-bold mt-1">{Math.round(analytics.totalQuantity).toLocaleString()} L</p>
          </div>
          <div className="stat-card bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5">
            <p className="text-xs text-[rgb(var(--muted-foreground))] uppercase tracking-wider">Avg Cost/Unit</p>
            <p className="text-2xl font-bold mt-1">₹{analytics.avgCostPerUnit?.toFixed(2)}/L</p>
          </div>
        </div>
      )}

      {tab === "analytics" && analytics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> Monthly Fuel Cost</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={analytics.monthlyTrends}>
                <defs><linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground))" }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground))" }} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: "12px", fontSize: "12px" }} formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="cost" stroke="#6366f1" fill="url(#fuelGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Droplets className="w-4 h-4 text-indigo-500" /> Consumption by Vehicle</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics.byVehicle?.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="registration" tick={{ fontSize: 9, fill: "rgb(var(--muted-foreground))" }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground))" }} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="totalQuantity" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Liters" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* Logs Table */
        <div className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead><tr className="border-b border-[rgb(var(--border))]">
                <th className="text-left p-4">Date</th><th className="text-left p-4">Vehicle</th>
                <th className="text-left p-4 hidden md:table-cell">Qty (L)</th><th className="text-left p-4 hidden md:table-cell">Rate</th>
                <th className="text-left p-4">Total</th><th className="text-left p-4 hidden lg:table-cell">Odometer</th>
              </tr></thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="p-4"><div className="h-10 bg-[rgb(var(--secondary))] rounded-lg animate-pulse" /></td></tr>)
                : logs.map(l => (
                  <tr key={l.id}>
                    <td className="p-4 text-sm">{formatDate(l.date)}</td>
                    <td className="p-4"><p className="text-sm font-medium">{l.vehicle?.registrationNumber}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">{l.station}</p></td>
                    <td className="p-4 hidden md:table-cell text-sm">{l.quantity} L</td>
                    <td className="p-4 hidden md:table-cell text-sm">₹{l.costPerUnit}/L</td>
                    <td className="p-4 text-sm font-semibold">{formatCurrency(l.totalCost)}</td>
                    <td className="p-4 hidden lg:table-cell text-sm font-mono">{l.odometer?.toLocaleString()} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-[rgb(var(--border))]">
              <p className="text-xs text-[rgb(var(--muted-foreground))]">Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex gap-1">
                <button disabled={pagination.page <= 1} onClick={() => fetchLogs(pagination.page - 1)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchLogs(pagination.page + 1)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border))]"><h2 className="text-lg font-semibold">Add Fuel Log</h2><button onClick={() => setShowForm(false)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{formError}</div>}
              <div><label className="block text-xs font-medium mb-1.5">Vehicle *</label>
                <select value={formData.vehicleId || ""} onChange={e => setFormData({ ...formData, vehicleId: e.target.value })} required className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium mb-1.5">Quantity (L) *</label>
                  <input type="number" step="0.1" value={formData.quantity || ""} onChange={e => setFormData({ ...formData, quantity: e.target.value })} required className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Cost/Unit (₹) *</label>
                  <input type="number" step="0.01" value={formData.costPerUnit || ""} onChange={e => setFormData({ ...formData, costPerUnit: e.target.value })} required className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Odometer *</label>
                  <input type="number" value={formData.odometer || ""} onChange={e => setFormData({ ...formData, odometer: e.target.value })} required className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Station</label>
                  <input value={formData.station || ""} onChange={e => setFormData({ ...formData, station: e.target.value })} className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Indian Oil" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm border border-[rgb(var(--border))]">Cancel</button>
                <button type="submit" disabled={saving} className="gradient-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">Add Log</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
