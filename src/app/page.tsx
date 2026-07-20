/**
 * ============================================================================
 * FILE: src/app/page.tsx
 * ============================================================================
 * 
 * FUNGSI:
 *   Halaman utama aplikasi AkunKu - Menampilkan semua UI dan logika
 * 
 * INI ADALAH FILE TERBESAR - Lihat PAGE_DOCUMENTATION.md untuk detail lengkap
 * 
 * FITUR YANG ADA DI FILE INI:
 *   1. Summary Cards (ringkasan total akun, menang, kalah, profit)
 *   2. Grafik Global (import dari GlobalCharts)
 *   3. Daftar Akun (cards dengan info lengkap)
 *   4. Modal Tambah/Edit Akun
 *   5. Modal Riwayat (dengan grafik per akun dan form tambah)
 *   6. Modal Export (copy to clipboard, download CSV)
 *   7. Pencarian akun
 * 
 * TERHUBUNG DENGAN:
 *   Import:
 *     - @/lib/utils           → formatCurrency, formatDate, nowLocalDatetime
 *     - @/components/GlobalCharts → Grafik global (bulanan)
 *     - @/components/AccountChart → Grafik per akun (harian)
 * 
 *   API yang dipanggil:
 *     - GET/POST/PUT/DELETE /api/accounts  → CRUD akun
 *     - GET/POST/DELETE /api/histories     → CRUD riwayat
 *     - GET /api/summary                   → Ringkasan total
 *     - GET /api/export                    → Data untuk export
 *     - GET /api/charts                    → Data grafik (via komponen)
 * 
 * DOKUMENTASI LENGKAP:
 *   Lihat file PAGE_DOCUMENTATION.md di folder yang sama
 * 
 * ============================================================================
 */

"use client";  // Menandakan ini Client Component (berjalan di browser)

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate, nowLocalDatetime } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamic import untuk komponen grafik (disable SSR karena pakai browser APIs)
const GlobalCharts = dynamic(() => import("@/components/GlobalCharts"), { ssr: false });
const AccountChart = dynamic(() => import("@/components/AccountChart"), { ssr: false });

// URL Google Sheet untuk integrasi export
const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1Ao3QBEgPku4p5LVM-QAIokhuaPfLd-tj2NwRP6sTie4/edit";

interface Account {
  id: number;
  siteName: string;
  link: string;
  username: string;
  password: string;
  totalWin: string;
  totalLoss: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface History {
  id: number;
  accountId: number;
  type: string;
  amount: string;
  description: string | null;
  date: string;
}

interface Summary {
  totalAccounts: number;
  totalWin: number;
  totalLoss: number;
  netProfit: number;
}

export default function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [histories, setHistories] = useState<History[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCopied, setExportCopied] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(true);

  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());

  // Account form
  const [formSiteName, setFormSiteName] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // History form
  const [historyType, setHistoryType] = useState<"win" | "loss">("win");
  const [historyAmount, setHistoryAmount] = useState("");
  const [historyDesc, setHistoryDesc] = useState("");
  const [historyDate, setHistoryDate] = useState(nowLocalDatetime());
  const [historyError, setHistoryError] = useState("");
  const [submittingHistory, setSubmittingHistory] = useState(false);
  const [historyChartKey, setHistoryChartKey] = useState(0);

  const [search, setSearch] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [accRes, sumRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/summary"),
      ]);
      const accData = await accRes.json();
      const sumData = await sumRes.json();
      setAccounts(Array.isArray(accData) ? accData : []);
      setSummary(sumData);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchHistories = async (accountId: number) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/histories?accountId=${accountId}`);
      const data = await res.json();
      setHistories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ========== Account CRUD ==========
  const openAddAccount = () => {
    setEditingAccount(null);
    setFormSiteName(""); setFormLink(""); setFormUsername(""); setFormPassword(""); setFormNotes(""); setFormError("");
    setShowAccountModal(true);
  };

  const openEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setFormSiteName(acc.siteName); setFormLink(acc.link); setFormUsername(acc.username); setFormPassword(acc.password); setFormNotes(acc.notes || ""); setFormError("");
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(""); setSubmitting(true);
    try {
      const method = editingAccount ? "PUT" : "POST";
      const body = editingAccount
        ? { id: editingAccount.id, siteName: formSiteName, link: formLink, username: formUsername, password: formPassword, notes: formNotes }
        : { siteName: formSiteName, link: formLink, username: formUsername, password: formPassword, notes: formNotes };
      const res = await fetch("/api/accounts", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Gagal menyimpan"); return; }
      setShowAccountModal(false); fetchData();
    } catch { setFormError("Terjadi kesalahan"); } finally { setSubmitting(false); }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm("Yakin hapus akun ini? Semua riwayat akan ikut terhapus.")) return;
    try {
      await fetch("/api/accounts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      fetchData();
      if (selectedAccount?.id === id) { setSelectedAccount(null); setShowHistoryModal(false); }
    } catch (err) { console.error(err); }
  };

  // ========== History ==========
  const openHistory = (acc: Account) => {
    setSelectedAccount(acc);
    setShowHistoryModal(true);
    setHistoryType("win"); setHistoryAmount(""); setHistoryDesc(""); setHistoryDate(nowLocalDatetime()); setHistoryError("");
    fetchHistories(acc.id);
  };

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    setHistoryError(""); setSubmittingHistory(true);
    try {
      const res = await fetch("/api/histories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccount!.id, type: historyType, amount: Number(historyAmount), description: historyDesc, date: historyDate }),
      });
      const data = await res.json();
      if (!res.ok) { setHistoryError(data.error || "Gagal"); return; }
      setHistoryAmount(""); setHistoryDesc(""); setHistoryDate(nowLocalDatetime());
      fetchHistories(selectedAccount!.id);
      fetchData();
      setHistoryChartKey((k) => k + 1);
    } catch { setHistoryError("Terjadi kesalahan"); } finally { setSubmittingHistory(false); }
  };

  const handleDeleteHistory = async (h: History) => {
    if (!confirm("Hapus riwayat ini?")) return;
    try {
      await fetch("/api/histories", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: h.id, accountId: h.accountId, type: h.type, amount: h.amount }),
      });
      fetchHistories(selectedAccount!.id); fetchData();
      setHistoryChartKey((k) => k + 1);
    } catch (err) { console.error(err); }
  };

  const handleDeleteAllHistories = async () => {
    if (!selectedAccount) return;
    if (!confirm(`Yakin hapus SEMUA riwayat untuk ${selectedAccount.siteName}? Data tidak bisa dikembalikan.`)) return;
    try {
      // Delete all histories one by one (to properly update totals)
      for (const h of histories) {
        await fetch("/api/histories", {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: h.id, accountId: h.accountId, type: h.type, amount: h.amount }),
        });
      }
      fetchHistories(selectedAccount.id); fetchData();
      setHistoryChartKey((k) => k + 1);
    } catch (err) { console.error(err); }
  };

  // ========== Export ==========
  const handleCopyAccounts = async () => {
    try {
      const res = await fetch("/api/export"); const data = await res.json();
      const header = "Nama Situs\tLink\tUsername\tPassword\tTotal Menang\tTotal Kalah\tNet Profit\tCatatan";
      const rows = data.accounts.map((a: { siteName: string; link: string; username: string; password: string; totalWin: number; totalLoss: number; net: number; notes: string }) =>
        `${a.siteName}\t${a.link}\t${a.username}\t${a.password}\t${a.totalWin}\t${a.totalLoss}\t${a.net}\t${a.notes}`
      );
      await navigator.clipboard.writeText([header, ...rows].join("\n"));
      setExportCopied("accounts"); setTimeout(() => setExportCopied(null), 2000);
    } catch { alert("Gagal menyalin"); }
  };

  const handleCopyHistories = async () => {
    try {
      const res = await fetch("/api/export"); const data = await res.json();
      const header = "Nama Situs\tUsername\tTipe\tJumlah\tKeterangan\tTanggal";
      const rows = data.histories.map((h: { siteName: string; username: string; type: string; amount: number; description: string; date: string }) =>
        `${h.siteName}\t${h.username}\t${h.type}\t${h.amount}\t${h.description}\t${h.date}`
      );
      await navigator.clipboard.writeText([header, ...rows].join("\n"));
      setExportCopied("histories"); setTimeout(() => setExportCopied(null), 2000);
    } catch { alert("Gagal menyalin"); }
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await fetch("/api/export"); const data = await res.json();
      let csv = "Nama Situs,Link,Username,Password,Total Menang,Total Kalah,Net Profit,Catatan\n";
      for (const a of data.accounts) csv += `"${a.siteName}","${a.link}","${a.username}","${a.password}",${a.totalWin},${a.totalLoss},${a.net},"${a.notes}"\n`;
      csv += "\n\nRIWAYAT TRANSAKSI\nNama Situs,Username,Tipe,Jumlah,Keterangan,Tanggal\n";
      for (const h of data.histories) csv += `"${h.siteName}","${h.username}","${h.type}",${h.amount},"${h.description}","${h.date}"\n`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `akunKu_data_${new Date().toISOString().split("T")[0]}.csv`; link.click(); URL.revokeObjectURL(url);
    } catch { alert("Gagal download"); }
  };

  const togglePassword = (id: number) => {
    setVisiblePasswords((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const copyToClipboard = async (text: string) => { await navigator.clipboard.writeText(text); };

  const filtered = accounts.filter((a) =>
    a.siteName.toLowerCase().includes(search.toLowerCase()) ||
    a.username.toLowerCase().includes(search.toLowerCase()) ||
    a.link.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-emerald-400 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-400">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AkunKu</h1>
                <p className="text-slate-400 text-xs hidden sm:block">Kelola Akun & Catatan Keuangan</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <a href={GOOGLE_SHEET_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 px-3 py-2 rounded-xl text-sm font-medium transition">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5