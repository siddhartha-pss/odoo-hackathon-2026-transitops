"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { apiClient, formatCurrency, formatDate, getStatusColor, getStatusLabel, cn, daysUntil } from "@/lib/utils";
import { Truck, Plus, Search, Filter, ChevronLeft, ChevronRight, Eye, Edit, Trash2, X, AlertTriangle, QrCode, FileText } from "lucide-react";

interface Vehicle {
  id: string; registrationNumber: string; model: string; manufacturer: string; type: string;
  capacity: number; currentOdometer: number; acquisitionCost: number; currentStatus: string;
  insuranceExpiry: string; fitnessExpiry: string; createdAt: string;
  _count?: { trips: number; maintenance: number; fuelLogs: number };
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const fetchVehicles = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", ...(search && { search }), ...(statusFilter && { status: statusFilter }) });
      const data = await apiClient(`/vehicles?${params}`);
      setVehicles(data.data);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFormError("");
    try {
      if (!formData.registrationNumber || !formData.model || !formData.manufacturer) {
        setFormError("Registration number, model, and manufacturer are required"); setSaving(false); return;
      }
      if (editVehicle) {
        await apiClient(`/vehicles/${editVehicle.id}`, { method: "PUT", body: JSON.stringify(formData) });
        setToast({ message: "Vehicle updated successfully", type: "success" });
      } else {
        await apiClient("/vehicles", { method: "POST", body: JSON.stringify(formData) });
        setToast({ message: "Vehicle created successfully", type: "success" });
      }
      setShowForm(false); setEditVehicle(null); setFormData({});
      fetchVehicles(pagination.page);
    } catch (err: any) { setFormError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await apiClient(`/vehicles/${id}`, { method: "DELETE" });
      setToast({ message: "Vehicle deleted", type: "success" });
      fetchVehicles(pagination.page);
    } catch (err: any) { setToast({ message: err.message, type: "error" }); }
  };

  const openEdit = (v: Vehicle) => {
    setEditVehicle(v);
    setFormData({
      registrationNumber: v.registrationNumber, model: v.model, manufacturer: v.manufacturer,
      type: v.type, capacity: v.capacity, currentOdometer: v.currentOdometer,
      acquisitionCost: v.acquisitionCost, insuranceExpiry: v.insuranceExpiry?.split("T")[0],
      fitnessExpiry: v.fitnessExpiry?.split("T")[0],
    });
    setShowForm(true);
  };

  const openDetail = async (id: string) => {
    try {
      const data = await apiClient(`/vehicles/${id}`);
      setShowDetail(data);
    } catch (err) { console.error(err); }
  };

  const statuses = ["", "active", "available", "in_shop", "retired"];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={cn("fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium",
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
          {toast.message}
        </motion.div>
      )}

      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="w-6 h-6 text-indigo-500" /> Vehicles</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">{pagination.total} vehicles in fleet</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditVehicle(null); setFormData({ type: "Truck" }); }}
          className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicles..."
            className="w-full pl-10 pr-4 py-2.5 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-2 rounded-xl text-xs font-medium transition-colors border",
                statusFilter === s ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-[rgb(var(--card))] border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]")}>
              {s ? getStatusLabel(s) : "All"}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={item} className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr className="border-b border-[rgb(var(--border))]">
                <th className="text-left p-4">Vehicle</th>
                <th className="text-left p-4 hidden md:table-cell">Type</th>
                <th className="text-left p-4 hidden lg:table-cell">Capacity</th>
                <th className="text-left p-4 hidden lg:table-cell">Odometer</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4 hidden xl:table-cell">Insurance</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="p-4"><div className="h-10 bg-[rgb(var(--secondary))] rounded-lg animate-pulse" /></td></tr>
                ))
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16">
                  <Truck className="w-12 h-12 text-[rgb(var(--muted-foreground))] mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-[rgb(var(--muted-foreground))]">No vehicles found</p>
                </td></tr>
              ) : vehicles.map(v => (
                <tr key={v.id} className="cursor-pointer" onClick={() => openDetail(v.id)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center"><Truck className="w-5 h-5 text-indigo-500" /></div>
                      <div><p className="text-sm font-semibold">{v.registrationNumber}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">{v.manufacturer} {v.model}</p></div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell"><span className="text-sm">{v.type}</span></td>
                  <td className="p-4 hidden lg:table-cell"><span className="text-sm">{v.capacity} {v.type === "Bus" ? "seats" : "tons"}</span></td>
                  <td className="p-4 hidden lg:table-cell"><span className="text-sm font-mono">{v.currentOdometer.toLocaleString()} km</span></td>
                  <td className="p-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(v.currentStatus))}>{getStatusLabel(v.currentStatus)}</span>
                  </td>
                  <td className="p-4 hidden xl:table-cell">
                    {v.insuranceExpiry && (
                      <span className={cn("text-xs", daysUntil(v.insuranceExpiry) < 30 ? "text-amber-400" : "text-[rgb(var(--muted-foreground))]")}>
                        {formatDate(v.insuranceExpiry)}
                        {daysUntil(v.insuranceExpiry) < 0 && <AlertTriangle className="inline w-3 h-3 ml-1 text-red-400" />}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openDetail(v.id)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(v)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[rgb(var(--border))]">
            <p className="text-xs text-[rgb(var(--muted-foreground))]">Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</p>
            <div className="flex gap-1">
              <button disabled={pagination.page <= 1} onClick={() => fetchVehicles(pagination.page - 1)}
                className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchVehicles(pagination.page + 1)}
                className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border))]">
              <h2 className="text-lg font-semibold">{editVehicle ? "Edit Vehicle" : "Add Vehicle"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{formError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium mb-1.5">Registration Number *</label>
                  <input value={formData.registrationNumber || ""} onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="KA-01-AB-1234" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Model *</label>
                  <input value={formData.model || ""} onChange={e => setFormData({ ...formData, model: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Tata Prima 4928" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Manufacturer *</label>
                  <input value={formData.manufacturer || ""} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Tata Motors" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Type</label>
                  <select value={formData.type || "Truck"} onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option>Truck</option><option>Bus</option><option>Van</option><option>Car</option></select></div>
                <div><label className="block text-xs font-medium mb-1.5">Capacity (tons/seats)</label>
                  <input type="number" step="0.1" value={formData.capacity || ""} onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Current Odometer (km)</label>
                  <input type="number" value={formData.currentOdometer || ""} onChange={e => setFormData({ ...formData, currentOdometer: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Acquisition Cost (₹)</label>
                  <input type="number" value={formData.acquisitionCost || ""} onChange={e => setFormData({ ...formData, acquisitionCost: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Insurance Expiry</label>
                  <input type="date" value={formData.insuranceExpiry || ""} onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-xs font-medium mb-1.5">Fitness Expiry</label>
                  <input type="date" value={formData.fitnessExpiry || ""} onChange={e => setFormData({ ...formData, fitnessExpiry: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm border border-[rgb(var(--border))] hover:bg-[rgb(var(--secondary))]">Cancel</button>
                <button type="submit" disabled={saving} className="gradient-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                  {editVehicle ? "Update" : "Create"} Vehicle
                </button>
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
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center"><Truck className="w-6 h-6 text-white" /></div>
                <div>
                  <h2 className="text-lg font-semibold">{showDetail.registrationNumber}</h2>
                  <p className="text-sm text-[rgb(var(--muted-foreground))]">{showDetail.manufacturer} {showDetail.model}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("px-3 py-1 rounded-full text-xs font-medium border", getStatusColor(showDetail.currentStatus))}>{getStatusLabel(showDetail.currentStatus)}</span>
                <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1"><p className="text-xs text-[rgb(var(--muted-foreground))]">Type</p><p className="text-sm font-medium">{showDetail.type}</p></div>
              <div className="space-y-1"><p className="text-xs text-[rgb(var(--muted-foreground))]">Capacity</p><p className="text-sm font-medium">{showDetail.capacity} {showDetail.type === "Bus" ? "seats" : "tons"}</p></div>
              <div className="space-y-1"><p className="text-xs text-[rgb(var(--muted-foreground))]">Odometer</p><p className="text-sm font-medium font-mono">{showDetail.currentOdometer?.toLocaleString()} km</p></div>
              <div className="space-y-1"><p className="text-xs text-[rgb(var(--muted-foreground))]">Acquisition Cost</p><p className="text-sm font-medium">{formatCurrency(showDetail.acquisitionCost)}</p></div>
              <div className="space-y-1"><p className="text-xs text-[rgb(var(--muted-foreground))]">Insurance Expiry</p><p className="text-sm font-medium">{showDetail.insuranceExpiry ? formatDate(showDetail.insuranceExpiry) : "N/A"}</p></div>
              <div className="space-y-1"><p className="text-xs text-[rgb(var(--muted-foreground))]">Fitness Expiry</p><p className="text-sm font-medium">{showDetail.fitnessExpiry ? formatDate(showDetail.fitnessExpiry) : "N/A"}</p></div>
              <div className="space-y-1"><p className="text-xs text-[rgb(var(--muted-foreground))]">Total Trips</p><p className="text-sm font-medium">{showDetail._count?.trips || 0}</p></div>
              <div className="space-y-1"><p className="text-xs text-[rgb(var(--muted-foreground))]">Maintenance Records</p><p className="text-sm font-medium">{showDetail._count?.maintenance || 0}</p></div>
              <div className="space-y-1"><p className="text-xs text-[rgb(var(--muted-foreground))]">QR Code</p><p className="text-sm font-medium font-mono text-indigo-400">{showDetail.qrCode?.substring(0, 20)}...</p></div>
            </div>
            {showDetail.trips?.length > 0 && (
              <div className="px-6 pb-6">
                <h3 className="text-sm font-semibold mb-3">Recent Trips</h3>
                <div className="space-y-2">
                  {showDetail.trips.slice(0, 5).map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--secondary))]">
                      <div><p className="text-sm font-medium">{t.pickup} → {t.destination}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">{formatDate(t.createdAt)}</p></div>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs border", getStatusColor(t.status))}>{getStatusLabel(t.status)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
