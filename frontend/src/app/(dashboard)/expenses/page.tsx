"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiClient, formatCurrency, formatDate, cn } from "@/lib/utils";
import { Receipt, Plus, X, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];
const categories = ["fuel", "maintenance", "tolls", "driver_salary", "insurance", "miscellaneous"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const fetchExpenses = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", ...(catFilter && { category: catFilter }) });
      const [data, sum] = await Promise.all([apiClient(`/expenses?${params}`), apiClient("/expenses/summary/breakdown")]);
      setExpenses(data.data); setPagination(data.pagination); setSummary(sum);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, [catFilter]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      if (!formData.category || !formData.amount) { setFormError("Category and amount required"); setSaving(false); return; }
      await apiClient("/expenses", { method: "POST", body: JSON.stringify(formData) });
      setToast({ message: "Expense added", type: "success" }); setShowForm(false); setFormData({}); fetchExpenses();
    } catch (err: any) { setFormError(err.message); } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {toast && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={cn("fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium", toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>{toast.message}</motion.div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="w-6 h-6 text-indigo-500" /> Expenses</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">Track all operational costs</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormData({ category: "fuel" }); }} className="gradient-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 shadow-lg shadow-indigo-500/25"><Plus className="w-4 h-4" /> Add Expense</button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="stat-card bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5">
            <p className="text-xs text-[rgb(var(--muted-foreground))] uppercase tracking-wider">Total Expenses</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(summary.total)}</p>
          </div>
          <div className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
            <h3 className="text-sm font-semibold mb-3">By Category</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={summary.byCategory} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="amount" nameKey="category">
                {summary.byCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip contentStyle={{ backgroundColor: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: "12px", fontSize: "12px" }} formatter={(v: number) => formatCurrency(v)} /></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5 space-y-2">
            <h3 className="text-sm font-semibold mb-2">Breakdown</h3>
            {summary.byCategory.map((c: any, i: number) => (
              <div key={c.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-xs capitalize">{c.category.replace(/_/g, " ")}</span></div>
                <span className="text-xs font-semibold">{formatCurrency(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCatFilter("")} className={cn("px-3 py-2 rounded-xl text-xs font-medium border transition-colors", !catFilter ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-[rgb(var(--card))] border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))]")}>All</button>
        {categories.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className={cn("px-3 py-2 rounded-xl text-xs font-medium border transition-colors capitalize", catFilter === c ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-[rgb(var(--card))] border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))]")}>{c.replace(/_/g, " ")}</button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr className="border-b border-[rgb(var(--border))]"><th className="text-left p-4">Date</th><th className="text-left p-4">Category</th><th className="text-left p-4 hidden md:table-cell">Description</th><th className="text-left p-4 hidden lg:table-cell">Vehicle</th><th className="text-right p-4">Amount</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={5} className="p-4"><div className="h-10 bg-[rgb(var(--secondary))] rounded-lg animate-pulse" /></td></tr>)
              : expenses.map(e => (
                <tr key={e.id}><td className="p-4 text-sm">{formatDate(e.date)}</td>
                  <td className="p-4"><span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/10 text-indigo-400 capitalize">{e.category.replace(/_/g, " ")}</span></td>
                  <td className="p-4 hidden md:table-cell text-sm text-[rgb(var(--muted-foreground))]">{e.description || "-"}</td>
                  <td className="p-4 hidden lg:table-cell text-sm">{e.vehicle?.registrationNumber || "-"}</td>
                  <td className="p-4 text-right text-sm font-semibold">{formatCurrency(e.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[rgb(var(--border))]">
            <span className="text-xs text-[rgb(var(--muted-foreground))]">Page {pagination.page}/{pagination.totalPages}</span>
            <div className="flex gap-1">
              <button disabled={pagination.page <= 1} onClick={() => fetchExpenses(pagination.page - 1)} className="p-2 rounded-lg disabled:opacity-30 hover:bg-[rgb(var(--secondary))]"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchExpenses(pagination.page + 1)} className="p-2 rounded-lg disabled:opacity-30 hover:bg-[rgb(var(--secondary))]"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border))]"><h2 className="text-lg font-semibold">Add Expense</h2><button onClick={() => setShowForm(false)} className="p-2 hover:bg-[rgb(var(--secondary))] rounded-lg"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{formError}</div>}
              <div><label className="block text-xs font-medium mb-1.5">Category *</label>
                <select value={formData.category || "fuel"} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {categories.map(c => <option key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</option>)}</select></div>
              <div><label className="block text-xs font-medium mb-1.5">Amount (₹) *</label>
                <input type="number" value={formData.amount || ""} onChange={e => setFormData({ ...formData, amount: e.target.value })} required className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block text-xs font-medium mb-1.5">Description</label>
                <input value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2.5 bg-[rgb(var(--secondary))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[rgb(var(--border))]">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm border border-[rgb(var(--border))]">Cancel</button>
                <button type="submit" disabled={saving} className="gradient-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">Add</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
