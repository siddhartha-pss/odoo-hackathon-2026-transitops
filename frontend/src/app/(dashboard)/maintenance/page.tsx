"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { apiClient, formatCurrency, formatDate, getStatusColor, getStatusLabel, cn } from "@/lib/utils";
import { Wrench, Plus, Search, X, ChevronLeft, ChevronRight, Play, CheckCircle2, Calendar } from "lucide-react";

export default function MaintenancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const fetchRecords = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", ...(search && { search }), ...(statusFilter && { status: statusFilter }) });
      const data = await apiClient(`/maintenance?${params}`);
      setRecords(data.data); setPagination(data.pagination);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      if (!formData.vehicleId || !formData.description || !formData.scheduledDate) {
        setFormError("Vehicle, description, and date are required"); setSaving(false); return;
      }
      await apiClient("/maintenance", { method: "POST", body: JSON.stringify(formData) });
      setToast({ message: "Maintenance scheduled", type: "success" });
      setShowForm(false); setFormData({}); fetchRecords(pagination.page);
    } catch (err: any) { setFormError(err.message); } finally { setSaving(false); }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      await apiClient(`/maintenance/${id}/${action}`, { method: "PATCH", body: JSON.stringify({}) });
      setToast({ message: `Maintenance ${action === "start" ? "started" : "completed"}`, type: "success" });
      fetchRecords(pagination.page);
    } catch (err: any) { setToast({ message: err.message, type: "error" }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    try { await apiClient(`/maintenance/${id}`, { method: "DELETE" }); setToast({ message: "Deleted", type: "success" }); fetchRecords(pagination.page); } catch (err: any) { setToast({ message: err.message, type: "error" }); }
  };

  const loadVehicles = async () => {
    try { const v = await apiClient("/vehicles?limit=100"); setVehicles(v.data || []); } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {toast && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={cn("fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium", toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>{toast.message}</motion.div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="w-6 h-6 text-indigo-500" /> Maintenance</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">{pagination.total} records</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormData({ type: "preventive", priority: "medium" }); loadVehicles(); }}
          className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 shadow-lg shadow-indigo-500/25">
          <Plus className="w-4 h-4" /> Schedule Maintenance
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="w-full pl-10 pr-4 py-2.5 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-2">
          {["", "scheduled", "in_progress", "completed"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn("px-3 py-2 rounded-xl text-xs font-medium border transition-colors", statusFilter === s ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-[rgb(var(--card))] border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))]")}>{s ? getStatusLabel(s) : "All"}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 bg-[rgb(var(--card))] rounded-2xl animate-pulse border border-[rgb(var(--border))]" />) :
        records.length === 0 ? <div className="col-span-full text-center py-16"><Wrench className="w-12 h-12 text-[rgb(var(--muted-foreground))] mx-auto mb-3 opacity-30" /><p className="text-sm text-[rgb(var(--muted-foreground))]">No maintenance records</p></div> :
        records.map(m => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", getStatusColor(m.status))}>{getStatusLabel(m.status)}</span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", getStatusColor(m.priority))}>{m.priority}</span>
              </div>
              <span className={cn("px-2 py-0.5 rounded-full text-xs", m.type === "preventive" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400")}>{m.type}</span>
            </div>
            <h3 className="text-sm font-semibold mb-1">{m.description}</h3>
            <p className="text-xs text-[rgb(var(--muted-foreground))] mb-3">{m.vehicle?.registrationNumber} — {m.vehicle?.model}</p>
            <div className="flex items-center justify-between text-xs text-[rgb(var(--muted-foreground))]">
              <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(m.scheduledDate)}</div>
              <span className="font-semibold text-[rgb(var(--foreground))]">{formatCurrency(m.cost)}</span>
            </div>
            {m.garageName && <p className="text-xs text-[rgb(var(--muted-foreground))] mt-2">🔧 {m.garageName}</p>}
            <div className="flex gap-2 mt-3 pt-3 border-t border-[rgb(var(--border))]">
              {m.status === "scheduled" && <button onClick={() => handleAction(m.id, "start")} className="flex-1 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 flex items-center justify-center gap-1"><Play className="w-3 h-3" /> Start</button>}
              {m.status === "in_progress" && <button onClick={() => handleAction(m.id, "complete")} className="flex-1 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Complete</button>}
              <button onClick={() => handleDelete(m.id)} className="py-1.5 px-3 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20">Delete</button>
            </div>
          </motion.div>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={pagination.page <= 1} onClick={() => fetchRecords(pagination.page - 1)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchRecords(pagination.page + 1)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border))]">
              <h2 className="text-lg font-semibold">Schedule Maintenance</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{formError}</div>}
              <div><label className="block text-xs font-medium mb-1.5">Vehicle *</label>
                <select value={formData.vehicleId || ""} onChange={e => setFormData({ ...formData, vehicleId: e.target.value })} required
                  className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select vehicle</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.registrationNumber} — {v.model}</option>)}</select></div>
              <div><label className="block text-xs font-medium mb-1.5">Description *</label>
                <textarea value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} required rows={2}
                  className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Oil change & filter replacement" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium mb-1.5">Type</label>
                  <select value={formData.type || "preventive"} onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="preventive">Preventive</option><option value="corrective">Corrective</option></select></div>
                <div><label className="block text-xs font-medium mb-1.5">Priority</label>
                  <select value={formData.priority || "medium"} onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                <div><label className="block text-xs font-medium mb-1.5">Scheduled Date *</label>
                  <input type="date" value={formData.scheduledDate || ""} onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Cost (₹)</label>
                  <input type="number" value={formData.cost || ""} onChange={e => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
              <div><label className="block text-xs font-medium mb-1.5">Garage Name</label>
                <input value={formData.garageName || ""} onChange={e => setFormData({ ...formData, garageName: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="AutoCare Workshop" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm border border-[rgb(var(--border))]">Cancel</button>
                <button type="submit" disabled={saving} className="gradient-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">Schedule</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
