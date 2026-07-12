import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TransitOps — Smart Transport Operations Platform",
  description: "Enterprise-grade AI-powered transport operations platform for fleet management, trip planning, maintenance tracking, and financial analytics.",
  keywords: ["transport", "fleet management", "logistics", "operations", "AI"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
