"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

export default function Home() {
  const router = useRouter();
  const { token, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser().then(() => {
      const t = localStorage.getItem("token");
      if (t) router.replace("/dashboard");
      else router.replace("/login");
    });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading TransitOps...</p>
      </div>
    </div>
  );
}
