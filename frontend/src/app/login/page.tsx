"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { motion } from "framer-motion";
import { Truck, Eye, EyeOff, ArrowRight, Shield, BarChart3, Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role: string) => {
    const emails: Record<string, string> = {
      fleet_manager: "fleet@transitops.com",
      dispatcher: "dispatcher@transitops.com",
      safety_officer: "safety@transitops.com",
      financial_analyst: "finance@transitops.com",
    };
    setEmail(emails[role] || "");
    setPassword("password123");
  };

  const features = [
    { icon: Truck, title: "Fleet Management", desc: "AI-powered fleet monitoring" },
    { icon: Shield, title: "Safety First", desc: "Real-time risk detection" },
    { icon: BarChart3, title: "Analytics", desc: "Actionable insights & reports" },
    { icon: Zap, title: "Smart Dispatch", desc: "AI recommendations" },
  ];

  return (
    <div className="auth-bg min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">TransitOps</h1>
              <p className="text-xs text-indigo-300">Smart Transport Platform</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Manage your fleet<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">with intelligence</span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-md">
              Enterprise-grade transport operations platform with AI-powered insights, real-time tracking, and automated workflows.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                className="glass rounded-xl p-4 hover:bg-white/[0.08] transition-colors"
              >
                <f.icon className="w-8 h-8 text-indigo-400 mb-2" />
                <h3 className="text-white font-semibold text-sm">{f.title}</h3>
                <p className="text-slate-400 text-xs mt-1">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-slate-500 text-sm">
          © 2026 TransitOps. Odoo Hackathon Project.
        </motion.p>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">TransitOps</h1>
              <p className="text-xs text-indigo-300">Smart Transport Platform</p>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 shadow-2xl shadow-black/20">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="text-slate-400 mt-2 text-sm">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm text-center">
                  {error}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full gradient-primary text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-indigo-500/25">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Login */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-slate-500 text-center mb-3">Quick login as:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: "fleet_manager", label: "Fleet Manager", color: "text-indigo-400" },
                  { role: "dispatcher", label: "Dispatcher", color: "text-violet-400" },
                  { role: "safety_officer", label: "Safety Officer", color: "text-emerald-400" },
                  { role: "financial_analyst", label: "Analyst", color: "text-amber-400" },
                ].map((r) => (
                  <button key={r.role} onClick={() => quickLogin(r.role)}
                    className="text-xs py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-center">
                    <span className={r.color}>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
