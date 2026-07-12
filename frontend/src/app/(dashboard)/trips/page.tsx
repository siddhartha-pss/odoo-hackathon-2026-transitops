"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { apiClient, formatCurrency, formatDate, getStatusColor, getStatusLabel, cn } from "@/lib/utils";
import { Map, Plus, Search, Eye, X, ChevronLeft, ChevronRight, Truck, Users, Package, ArrowRight, Play, CheckCircle2, XCircle, Brain } from "lucide-react";

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [aiRec, setAiRec] = useState<any>(null);

  const fetchTrips = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", ...(search && { search }), ...(statusFilter && { status: statusFilter }) });
      const data = await apiClient(`/trips?${params}`);
      setTrips(data.data); setPagination(data.pagination);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const loadFormData = async () => {
    try {
      const [v, d] = await Promise.all([
        apiClient("/vehicles?limit=100&status=available"),
        apiClient("/drivers?limit=100&status=available"),
      ]);
      setVehicles(v.data || []); setDrivers(d.data || []);
    } catch (err) { console.error(err); }
  };

  const loadAiRecommendations = async () => {
    try {
      const w = formData.cargoWeight || 0;
      const rec = await apiClient(`/ai/smart-dispatch?cargoWeight=${w}&cargoType=${formData.cargoType || "General"}`);
      setAiRec(rec);
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      if (!formData.vehicleId || !formData.driverId || !formData.pickup || !formData.destination) {
        setFormError("Vehicle, driver, pickup, and destination are required"); setSaving(false); return;
      }
      await apiClient("/trips", { method: "POST", body: JSON.stringify(formData) });
      setToast({ message: "Trip created", type: "success" });
      setShowForm(false); setFormData({}); setAiRec(null); fetchTrips(pagination.page);
    } catch (err: any) { setFormError(err.message); } finally { setSaving(false); }
  };

  const handleAction = async (id: string, action: string, body?: any) => {
    try {
      await apiClient(`/trips/${id}/${action}`, { method: "PATCH", body: JSON.stringify(body || {}) });
      setToast({ message: `Trip ${action}ed successfully`, type: "success" });
      fetchTrips(pagination.page);
      if (showDetail) setShowDetail(await apiClient(`/trips/${id}`));
    } catch (err: any) { setToast({ message: err.message, type: "error" }); }
  };

  const openDetail = async (id: string) => { try { setShowDetail(await apiClient(`/trips/${id}`)); } catch {} };

  const cargoTypes = ["General", "Electronics", "Food Products", "Textiles", "Chemicals", "Machinery", "Raw Materials", "FMCG"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {toast && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={cn("fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium", toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>{toast.message}</motion.div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Map className="w-6 h-6 text-indigo-500" /> Trips</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">{pagination.total} total trips</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormData({ cargoType: "General" }); loadFormData(); }}
          className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 shadow-lg shadow-indigo-500/25">
          <Plus className="w-4 h-4" /> Create Trip
        </button>
      </div>

      {/* Status quick filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trips..."
            className="w-full pl-10 pr-4 py-2.5 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "draft", "dispatched", "in_progress", "completed", "cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                statusFilter === s ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-[rgb(var(--card))] border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))]")}>
              {s ? getStatusLabel(s) : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr className="border-b border-[rgb(var(--border))]">
              <th className="text-left p-4">Trip</th><th className="text-left p-4">Route</th>
              <th className="text-left p-4 hidden md:table-cell">Vehicle</th><th className="text-left p-4 hidden lg:table-cell">Driver</th>
              <th className="text-left p-4">Status</th><th className="text-right p-4">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="p-4"><div className="h-10 bg-[rgb(var(--secondary))] rounded-lg animate-pulse" /></td></tr>)
              : trips.length === 0 ? <tr><td colSpan={6} className="text-center py-16"><Map className="w-12 h-12 text-[rgb(var(--muted-foreground))] mx-auto mb-3 opacity-30" /><p className="text-sm text-[rgb(var(--muted-foreground))]">No trips found</p></td></tr>
              : trips.map(t => (
                <tr key={t.id} className="cursor-pointer" onClick={() => openDetail(t.id)}>
                  <td className="p-4"><p className="text-sm font-mono font-semibold">{t.tripNumber}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">{formatDate(t.createdAt)}</p></td>
                  <td className="p-4">
                    <div className="flex items-center gap-2"><span className="text-sm">{t.pickup}</span><ArrowRight className="w-3 h-3 text-[rgb(var(--muted-foreground))]" /><span className="text-sm">{t.destination}</span></div>
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">{t.estimatedDistance} km • {t.cargoType}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell"><p className="text-sm">{t.vehicle?.registrationNumber}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">{t.vehicle?.model}</p></td>
                  <td className="p-4 hidden lg:table-cell"><p className="text-sm">{t.driver?.name}</p></td>
                  <td className="p-4"><span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(t.status))}>{getStatusLabel(t.status)}</span></td>
                  <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {t.status === "draft" && <button onClick={() => handleAction(t.id, "dispatch")} className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-400" title="Dispatch"><Play className="w-4 h-4" /></button>}
                      {(t.status === "dispatched" || t.status === "in_progress") && <button onClick={() => handleAction(t.id, "complete")} className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400" title="Complete"><CheckCircle2 className="w-4 h-4" /></button>}
                      {t.status !== "completed" && t.status !== "cancelled" && <button onClick={() => handleAction(t.id, "cancel", { reason: "Manual cancellation" })} className="p-2 hover:bg-red-500/10 rounded-lg text-red-400" title="Cancel"><XCircle className="w-4 h-4" /></button>}
                      <button onClick={() => openDetail(t.id)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><Eye className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[rgb(var(--border))]">
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-1">
              <button disabled={pagination.page <= 1} onClick={() => fetchTrips(pagination.page - 1)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchTrips(pagination.page + 1)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Create Trip Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowForm(false); setAiRec(null); }} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border))]">
              <h2 className="text-lg font-semibold">Create Trip</h2>
              <button onClick={() => { setShowForm(false); setAiRec(null); }} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{formError}</div>}
              
              {/* AI Recommendation Button */}
              <button type="button" onClick={loadAiRecommendations}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400 text-sm font-medium hover:bg-violet-500/15 transition-colors">
                <Brain className="w-4 h-4" /> Get AI Smart Dispatch Recommendations
              </button>

              {aiRec && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiRec.recommendedVehicles?.slice(0, 2).map((v: any) => (
                    <button key={v.id} type="button" onClick={() => setFormData({ ...formData, vehicleId: v.id })}
                      className={cn("p-3 rounded-xl border text-left text-sm transition-colors",
                        formData.vehicleId === v.id ? "border-indigo-500 bg-indigo-500/10" : "border-[rgb(var(--border))] hover:border-indigo-500/50")}>
                      <div className="flex items-center gap-2 mb-1"><Truck className="w-4 h-4 text-indigo-500" /><span className="font-medium">{v.registrationNumber}</span></div>
                      <p className="text-xs text-[rgb(var(--muted-foreground))]">{v.model} • Score: {v.score}</p>
                      <p className="text-xs text-emerald-400 mt-1">{v.reason}</p>
                    </button>
                  ))}
                  {aiRec.recommendedDrivers?.slice(0, 2).map((d: any) => (
                    <button key={d.id} type="button" onClick={() => setFormData({ ...formData, driverId: d.id })}
                      className={cn("p-3 rounded-xl border text-left text-sm transition-colors",
                        formData.driverId === d.id ? "border-violet-500 bg-violet-500/10" : "border-[rgb(var(--border))] hover:border-violet-500/50")}>
                      <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-violet-500" /><span className="font-medium">{d.name}</span></div>
                      <p className="text-xs text-[rgb(var(--muted-foreground))]">Safety: {d.safetyScore} • Rating: {d.performanceRating} • Score: {d.score}</p>
                      <p className="text-xs text-emerald-400 mt-1">{d.reason}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium mb-1.5">Vehicle *</label>
                  <select value={formData.vehicleId || ""} onChange={e => setFormData({ ...formData, vehicleId: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select vehicle</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registrationNumber} — {v.model} ({v.capacity} tons)</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium mb-1.5">Driver *</label>
                  <select value={formData.driverId || ""} onChange={e => setFormData({ ...formData, driverId: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name} — Safety: {d.safetyScore}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium mb-1.5">Pickup *</label>
                  <input value={formData.pickup || ""} onChange={e => setFormData({ ...formData, pickup: e.target.value })} required placeholder="Bangalore"
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Destination *</label>
                  <input value={formData.destination || ""} onChange={e => setFormData({ ...formData, destination: e.target.value })} required placeholder="Chennai"
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Cargo Weight (tons)</label>
                  <input type="number" step="0.1" value={formData.cargoWeight || ""} onChange={e => setFormData({ ...formData, cargoWeight: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Cargo Type</label>
                  <select value={formData.cargoType || "General"} onChange={e => setFormData({ ...formData, cargoType: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {cargoTypes.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="block text-xs font-medium mb-1.5">Estimated Distance (km)</label>
                  <input type="number" value={formData.estimatedDistance || ""} onChange={e => setFormData({ ...formData, estimatedDistance: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Estimated Cost (₹)</label>
                  <input type="number" value={formData.estimatedCost || ""} onChange={e => setFormData({ ...formData, estimatedCost: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Revenue (₹)</label>
                  <input type="number" value={formData.revenue || ""} onChange={e => setFormData({ ...formData, revenue: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
                <button type="button" onClick={() => { setShowForm(false); setAiRec(null); }} className="px-4 py-2.5 rounded-xl text-sm border border-[rgb(var(--border))]">Cancel</button>
                <button type="submit" disabled={saving} className="gradient-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">Create Trip</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetail(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border))]">
              <div><h2 className="text-lg font-semibold font-mono">{showDetail.tripNumber}</h2><p className="text-sm text-[rgb(var(--muted-foreground))]">{showDetail.pickup} → {showDetail.destination}</p></div>
              <div className="flex items-center gap-2">
                <span className={cn("px-3 py-1 rounded-full text-xs font-medium border", getStatusColor(showDetail.status))}>{getStatusLabel(showDetail.status)}</span>
                <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Timeline */}
              <div className="flex items-center justify-between px-4">
                {[
                  { label: "Created", date: showDetail.createdAt, done: true },
                  { label: "Dispatched", date: showDetail.dispatchedAt, done: !!showDetail.dispatchedAt },
                  { label: "Started", date: showDetail.startedAt, done: !!showDetail.startedAt },
                  { label: "Completed", date: showDetail.completedAt, done: !!showDetail.completedAt },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      step.done ? "bg-emerald-500 text-white" : "bg-[rgb(var(--secondary))] text-[rgb(var(--muted-foreground))]")}>{i + 1}</div>
                    <div><p className="text-xs font-medium">{step.label}</p>{step.date && <p className="text-[10px] text-[rgb(var(--muted-foreground))]">{formatDate(step.date)}</p>}</div>
                    {i < arr.length - 1 && <div className={cn("w-8 h-0.5 mx-2", step.done ? "bg-emerald-500" : "bg-[rgb(var(--border))]")} />}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><p className="text-xs text-[rgb(var(--muted-foreground))]">Vehicle</p><p className="text-sm font-medium">{showDetail.vehicle?.registrationNumber}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">{showDetail.vehicle?.model}</p></div>
                <div><p className="text-xs text-[rgb(var(--muted-foreground))]">Driver</p><p className="text-sm font-medium">{showDetail.driver?.name}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">{showDetail.driver?.phone}</p></div>
                <div><p className="text-xs text-[rgb(var(--muted-foreground))]">Cargo</p><p className="text-sm font-medium">{showDetail.cargoWeight} tons • {showDetail.cargoType}</p></div>
                <div><p className="text-xs text-[rgb(var(--muted-foreground))]">Distance</p><p className="text-sm font-medium">{showDetail.actualDistance || showDetail.estimatedDistance} km</p></div>
                <div><p className="text-xs text-[rgb(var(--muted-foreground))]">Cost</p><p className="text-sm font-medium">{formatCurrency(showDetail.actualCost || showDetail.estimatedCost)}</p></div>
                <div><p className="text-xs text-[rgb(var(--muted-foreground))]">Revenue</p><p className="text-sm font-medium text-emerald-500">{formatCurrency(showDetail.revenue)}</p></div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-[rgb(var(--border))]">
                {showDetail.status === "draft" && <button onClick={() => handleAction(showDetail.id, "dispatch")} className="flex-1 py-2.5 bg-blue-500/10 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Dispatch</button>}
                {showDetail.status === "dispatched" && <button onClick={() => handleAction(showDetail.id, "start")} className="flex-1 py-2.5 bg-violet-500/10 text-violet-400 rounded-xl text-sm font-medium hover:bg-violet-500/20 transition-colors flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Start Trip</button>}
                {(showDetail.status === "dispatched" || showDetail.status === "in_progress") && <button onClick={() => handleAction(showDetail.id, "complete")} className="flex-1 py-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Complete</button>}
                {showDetail.status !== "completed" && showDetail.status !== "cancelled" && <button onClick={() => handleAction(showDetail.id, "cancel", { reason: "Manual" })} className="flex-1 py-2.5 bg-red-500/10 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Cancel</button>}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
