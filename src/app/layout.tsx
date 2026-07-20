import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = { title: "Financial Recording App", description: "Aplikasi Pencatat Keuangan" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (<html lang="id"><body className="bg-slate-900 text-white antialiased">{children}</body></html>);
}