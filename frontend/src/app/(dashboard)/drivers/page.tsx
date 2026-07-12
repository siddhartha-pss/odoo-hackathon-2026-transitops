"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { apiClient, formatDate, getStatusColor, getStatusLabel, cn, daysUntil } from "@/lib/utils";
import { Users, Plus, Search, Eye, Edit, Trash2, X, Star, Shield, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState<any>(null);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const fetchDrivers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", ...(search && { search }), ...(statusFilter && { status: statusFilter }) });
      const data = await apiClient(`/drivers?${params}`);
      setDrivers(data.data); setPagination(data.pagination);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      if (!formData.name || !formData.phone || !formData.licenseNumber || !formData.licenseExpiry) {
        setFormError("Name, phone, license number, and license expiry are required"); setSaving(false); return;
      }
      if (editDriver) {
        await apiClient(`/drivers/${editDriver.id}`, { method: "PUT", body: JSON.stringify(formData) });
        setToast({ message: "Driver updated", type: "success" });
      } else {
        await apiClient("/drivers", { method: "POST", body: JSON.stringify(formData) });
        setToast({ message: "Driver added", type: "success" });
      }
      setShowForm(false); setEditDriver(null); setFormData({}); fetchDrivers(pagination.page);
    } catch (err: any) { setFormError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this driver?")) return;
    try { await apiClient(`/drivers/${id}`, { method: "DELETE" }); setToast({ message: "Driver deleted", type: "success" }); fetchDrivers(pagination.page);
    } catch (err: any) { setToast({ message: err.message, type: "error" }); }
  };

  const openEdit = (d: any) => {
    setEditDriver(d); setFormData({ name: d.name, phone: d.phone, emergencyContact: d.emergencyContact, licenseNumber: d.licenseNumber,
      licenseCategory: d.licenseCategory, licenseExpiry: d.licenseExpiry?.split("T")[0], medicalCertExpiry: d.medicalCertExpiry?.split("T")[0] });
    setShowForm(true);
  };

  const openDetail = async (id: string) => { try { setShowDetail(await apiClient(`/drivers/${id}`)); } catch {} };

  const getRatingStars = (rating: number) => Array.from({ length: 5 }, (_, i) => i < Math.round(rating));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {toast && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={cn("fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium", toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>{toast.message}</motion.div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-indigo-500" /> Drivers</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">{pagination.total} drivers registered</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditDriver(null); setFormData({ licenseCategory: "HMV" }); }}
          className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 shadow-lg shadow-indigo-500/25">
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drivers..."
            className="w-full pl-10 pr-4 py-2.5 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "available", "on_trip", "on_leave", "suspended"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                statusFilter === s ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-[rgb(var(--card))] border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))]")}>
              {s ? getStatusLabel(s) : "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr className="border-b border-[rgb(var(--border))]">
              <th className="text-left p-4">Driver</th><th className="text-left p-4 hidden md:table-cell">License</th>
              <th className="text-left p-4 hidden lg:table-cell">Safety</th><th className="text-left p-4 hidden lg:table-cell">Rating</th>
              <th className="text-left p-4">Status</th><th className="text-right p-4">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={6} className="p-4"><div className="h-10 bg-[rgb(var(--secondary))] rounded-lg animate-pulse" /></td></tr>)
              : drivers.length === 0 ? <tr><td colSpan={6} className="text-center py-16"><Users className="w-12 h-12 text-[rgb(var(--muted-foreground))] mx-auto mb-3 opacity-30" /><p className="text-sm text-[rgb(var(--muted-foreground))]">No drivers found</p></td></tr>
              : drivers.map(d => (
                <tr key={d.id} className="cursor-pointer" onClick={() => openDetail(d.id)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                        {d.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                      </div>
                      <div><p className="text-sm font-semibold">{d.name}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">{d.phone}</p></div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <p className="text-sm font-mono">{d.licenseNumber}</p>
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">{d.licenseCategory} • Exp: {formatDate(d.licenseExpiry)}</p>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <Shield className={cn("w-4 h-4", d.safetyScore >= 80 ? "text-emerald-500" : d.safetyScore >= 60 ? "text-amber-400" : "text-red-400")} />
                      <span className="text-sm font-semibold">{d.safetyScore}</span>
                    </div>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="flex items-center gap-0.5">
                      {getRatingStars(d.performanceRating).map((filled, i) => (
                        <Star key={i} className={cn("w-3.5 h-3.5", filled ? "text-amber-400 fill-amber-400" : "text-gray-600")} />
                      ))}
                      <span className="text-xs ml-1 text-[rgb(var(--muted-foreground))]">{d.performanceRating}</span>
                    </div>
                  </td>
                  <td className="p-4"><span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(d.currentStatus))}>{getStatusLabel(d.currentStatus)}</span></td>
                  <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openDetail(d.id)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(d)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(d.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[rgb(var(--border))]">
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</p>
            <div className="flex gap-1">
              <button disabled={pagination.page <= 1} onClick={() => fetchDrivers(pagination.page - 1)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchDrivers(pagination.page + 1)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border))]">
              <h2 className="text-lg font-semibold">{editDriver ? "Edit Driver" : "Add Driver"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{formError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "name", label: "Full Name *", type: "text", placeholder: "Suresh Reddy", required: true },
                  { key: "phone", label: "Phone *", type: "tel", placeholder: "+91-9876543210", required: true },
                  { key: "emergencyContact", label: "Emergency Contact", type: "tel", placeholder: "+91-9876543211" },
                  { key: "licenseNumber", label: "License Number *", type: "text", placeholder: "KA-DL-2020-001234", required: true },
                  { key: "licenseExpiry", label: "License Expiry *", type: "date", required: true },
                  { key: "medicalCertExpiry", label: "Medical Cert Expiry", type: "date" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium mb-1.5">{f.label}</label>
                    <input type={f.type} value={formData[f.key] || ""} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} required={f.required}
                      placeholder={f.placeholder} className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
                <div><label className="block text-xs font-medium mb-1.5">License Category</label>
                  <select value={formData.licenseCategory || "HMV"} onChange={e => setFormData({ ...formData, licenseCategory: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option>LMV</option><option>HMV</option><option>HGV</option></select></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm border border-[rgb(var(--border))]">Cancel</button>
                <button type="submit" disabled={saving} className="gradient-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {editDriver ? "Update" : "Add"} Driver
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetail(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border))]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg font-bold">
                  {showDetail.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{showDetail.name}</h2>
                  <p className="text-sm text-[rgb(var(--muted-foreground))]">{showDetail.phone} • {showDetail.licenseCategory}</p>
                </div>
              </div>
              <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[rgb(var(--secondary))] rounded-xl p-4 text-center">
                  <Shield className={cn("w-6 h-6 mx-auto mb-1", showDetail.safetyScore >= 80 ? "text-emerald-500" : "text-amber-400")} />
                  <p className="text-2xl font-bold">{showDetail.safetyScore}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">Safety Score</p>
                </div>
                <div className="bg-[rgb(var(--secondary))] rounded-xl p-4 text-center">
                  <Star className="w-6 h-6 mx-auto mb-1 text-amber-400 fill-amber-400" />
                  <p className="text-2xl font-bold">{showDetail.performanceRating}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">Rating</p>
                </div>
                <div className="bg-[rgb(var(--secondary))] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold">{showDetail.totalTrips}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">Total Trips</p>
                </div>
                <div className="bg-[rgb(var(--secondary))] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold">{showDetail.totalDistance?.toLocaleString()}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">Km Driven</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-[rgb(var(--muted-foreground))]">License</p><p className="text-sm font-mono">{showDetail.licenseNumber}</p></div>
                <div><p className="text-xs text-[rgb(var(--muted-foreground))]">License Expiry</p><p className="text-sm">{formatDate(showDetail.licenseExpiry)}</p></div>
                <div><p className="text-xs text-[rgb(var(--muted-foreground))]">Status</p><span className={cn("px-2 py-0.5 rounded-full text-xs border", getStatusColor(showDetail.currentStatus))}>{getStatusLabel(showDetail.currentStatus)}</span></div>
                <div><p className="text-xs text-[rgb(var(--muted-foreground))]">Emergency</p><p className="text-sm">{showDetail.emergencyContact || "N/A"}</p></div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
