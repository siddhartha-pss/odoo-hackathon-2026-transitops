"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiClient, formatCurrency, cn } from "@/lib/utils";
import { FileBarChart, Download, Filter, TrendingUp } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("trip_summary");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType, ...(dateRange.start && { startDate: dateRange.start }), ...(dateRange.end && { endDate: dateRange.end }) });
      const result = await apiClient(`/reports?${params}`);
      setData(result);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [reportType]);

  const exportReport = async (format: "csv" | "json") => {
    try {
      const params = new URLSearchParams({ type: reportType, format, ...(dateRange.start && { startDate: dateRange.start }), ...(dateRange.end && { endDate: dateRange.end }) });
      const response = await fetch(`http://localhost:3001/api/reports/export?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `report-${reportType}.${format}`; a.click();
    } catch (err) { console.error(err); }
  };

  const reportTypes = [
    { value: "trip_summary", label: "Trip Summary" },
    { value: "expense_breakdown", label: "Expense Breakdown" },
    { value: "vehicle_performance", label: "Vehicle Performance" },
    { value: "driver_performance", label: "Driver Performance" },
    { value: "fuel_consumption", label: "Fuel Consumption" },
    { value: "maintenance_history", label: "Maintenance History" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileBarChart className="w-6 h-6 text-indigo-500" /> Reports</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">Generate and export analytics reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportReport("csv")} className="px-4 py-2.5 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl text-sm flex items-center gap-2 hover:bg-[rgb(var(--secondary))] transition-colors"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={() => exportReport("json")} className="px-4 py-2.5 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl text-sm flex items-center gap-2 hover:bg-[rgb(var(--secondary))] transition-colors"><Download className="w-4 h-4" /> JSON</button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex flex-wrap gap-2">
        {reportTypes.map(r => (
          <button key={r.value} onClick={() => setReportType(r.value)}
            className={cn("px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
              reportType === r.value ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" : "bg-[rgb(var(--card))] border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]")}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Date Range */}
      <div className="flex gap-3 items-end">
        <div><label className="block text-xs font-medium mb-1.5">Start Date</label>
          <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
        <div><label className="block text-xs font-medium mb-1.5">End Date</label>
          <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
        <button onClick={fetchReport} className="gradient-primary text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"><Filter className="w-4 h-4" /> Apply</button>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-64 bg-[rgb(var(--card))] rounded-2xl animate-pulse border border-[rgb(var(--border))]" />
          <div className="h-64 bg-[rgb(var(--card))] rounded-2xl animate-pulse border border-[rgb(var(--border))]" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Summary Cards */}
          {data.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(data.summary).map(([key, value]: [string, any]) => (
                <div key={key} className="stat-card bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-5">
                  <p className="text-xs text-[rgb(var(--muted-foreground))] uppercase tracking-wider">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                  <p className="text-xl font-bold mt-1">{typeof value === "number" && value > 1000 ? formatCurrency(value) : String(value)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {data.chartData && data.chartData.length > 0 && (
            <div className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> {reportTypes.find(r => r.value === reportType)?.label} Chart</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis dataKey={Object.keys(data.chartData[0])[0]} tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground))" }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted-foreground))" }} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "rgb(var(--card))", border: "1px solid rgb(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                  <Legend />
                  {Object.keys(data.chartData[0]).slice(1).map((key, i) => (
                    <Bar key={key} dataKey={key} fill={["#6366f1", "#8b5cf6", "#10b981", "#f59e0b"][i % 4]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Data Table */}
          {data.data && data.data.length > 0 && (
            <div className="bg-[rgb(var(--card))] rounded-2xl border border-[rgb(var(--border))] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full data-table">
                  <thead><tr className="border-b border-[rgb(var(--border))]">
                    {Object.keys(data.data[0]).filter(k => k !== "id").slice(0, 6).map(k => (
                      <th key={k} className="text-left p-4">{k.replace(/([A-Z])/g, " $1").trim()}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.data.slice(0, 20).map((row: any, i: number) => (
                      <tr key={i}>
                        {Object.entries(row).filter(([k]) => k !== "id").slice(0, 6).map(([k, v]: [string, any]) => (
                          <td key={k} className="p-4 text-sm">{typeof v === "number" && v > 100 ? v.toLocaleString() : String(v ?? "-")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </motion.div>
  );
}
