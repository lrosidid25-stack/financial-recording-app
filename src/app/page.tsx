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

"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate, nowLocalDatetime } from "@/lib/utils";
import dynamic from "next/dynamic";

const GlobalCharts = dynamic(() => import("@/components/GlobalCharts"), { ssr: false });
const AccountChart = dynamic(() => import("@/components/AccountChart"), { ssr: false });

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

  const [formSiteName, setFormSiteName] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      fetch("/api/sheets", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }).catch(function(){});
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
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zM9 17H6v-3h3v3zm0-5H6V9h3v3zm0-5H6V4h3v3zm5 10h-3v-3h3v3zm0-5h-3V9h3v3zm0-5h-3V4h3v3zm4 10h-3v-3h3v3zm0-5h-3V9h3v3zm0-5h-3V4h3v3z" /></svg>
                Sheet
              </a>
              <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-xl text-sm font-medium transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export
              </button>
              <button onClick={openAddAccount} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-teal-700 transition shadow-lg shadow-emerald-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Tambah Akun
              </button>
            </div>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="sm:hidden bg-slate-800 p-2 rounded-xl border border-slate-700">
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
          {showMobileMenu && (
            <div className="sm:hidden mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-2">
              <a href={GOOGLE_SHEET_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-green-600/20 border border-green-500/30 text-green-400 px-4 py-2.5 rounded-xl text-sm font-medium">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zM9 17H6v-3h3v3zm0-5H6V9h3v3zm0-5H6V4h3v3zm5 10h-3v-3h3v3zm0-5h-3V9h3v3zm0-5h-3V4h3v3zm4 10h-3v-3h3v3zm0-5h-3V9h3v3zm0-5h-3V4h3v3z" /></svg>
                Buka Google Sheet
              </a>
              <button onClick={() => { setShowExportModal(true); setShowMobileMenu(false); }} className="flex items-center justify-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 px-4 py-2.5 rounded-xl text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export Data
              </button>
              <button onClick={() => { openAddAccount(); setShowMobileMenu(false); }} className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Tambah Akun
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 sm:p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center"><span className="text-sm">📦</span></div>
              <p className="text-slate-400 text-xs font-medium">Total Akun</p>
            </div>
            <p className="text-2xl font-bold text-white">{summary?.totalAccounts || 0}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 sm:p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-emerald-500/20 rounded-lg flex items-center justify-center"><span className="text-sm">🏆</span></div>
              <p className="text-slate-400 text-xs font-medium">Total Menang</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400">{summary ? formatCurrency(summary.totalWin) : "Rp0"}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 sm:p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-red-500/20 rounded-lg flex items-center justify-center"><span className="text-sm">💔</span></div>
              <p className="text-slate-400 text-xs font-medium">Total Kalah</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-400">{summary ? formatCurrency(summary.totalLoss) : "Rp0"}</p>
          </div>
          <div className={`bg-slate-800/50 border rounded-2xl p-4 sm:p-5 backdrop-blur ${summary && summary.netProfit >= 0 ? "border-emerald-500/30" : "border-red-500/30"}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-yellow-500/20 rounded-lg flex items-center justify-center"><span className="text-sm">💰</span></div>
              <p className="text-slate-400 text-xs font-medium">Profit / Rugi</p>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${summary && summary.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {summary ? formatCurrency(summary.netProfit) : "Rp0"}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-3"
          >
            <svg className={`w-4 h-4 transition-transform ${showCharts ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showCharts ? "Sembunyikan Grafik" : "Tampilkan Grafik"}
          </button>
          {showCharts && <GlobalCharts key={`global-${accounts.length}`} />}
        </div>

        <div className="mb-6">
          <div className="relative">
            <svg className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari akun..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-4xl">📦</span></div>
            <p className="text-slate-400 font-medium text-lg">{search ? "Tidak ditemukan" : "Belum ada akun"}</p>
            <p className="text-slate-500 text-sm mt-1">{search ? "Coba kata kunci lain" : "Klik \"Tambah Akun\" untuk memulai"}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((acc) => {
              const win = Number(acc.totalWin);
              const loss = Number(acc.totalLoss);
              const net = win - loss;
              return (
                <div key={acc.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600/50 transition group backdrop-blur">
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-lg">🌐</span></div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-white truncate">{acc.siteName}</h3>
                          <a href={acc.link.startsWith("http") ? acc.link : `https://${acc.link}`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 truncate block transition">{acc.link}</a>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEditAccount(acc)} className="p-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteAccount(acc.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400/70 hover:text-red-400 transition" title="Hapus">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2">
                        <div className="min-w-0 mr-2">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Username</p>
                          <p className="text-sm text-slate-200 font-mono truncate">{acc.username}</p>
                        </div>
                        <button onClick={() => copyToClipboard(acc.username)} className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition flex-shrink-0" title="Salin">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2">
                        <div className="min-w-0 mr-2">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Password</p>
                          <p className="text-sm text-slate-200 font-mono truncate">{visiblePasswords.has(acc.id) ? acc.password : "₢₢₢₢₢₢₢₢"}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => togglePassword(acc.id)} className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition">
                            {visiblePasswords.has(acc.id) ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.7 6.7m3.178 3.178l4.242 4.242M6.7 6.7L3 3m3.7 3.7l10.6 10.6m3.6 3.6L21 21" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                          </button>
                          <button onClick={() => copyToClipboard(acc.password)} className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 transition" title="Salin">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    {acc.notes && <p className="text-xs text-slate-500 italic mb-2">📝 {acc.notes}</p>}
                  </div>
                  <div className="grid grid-cols-3 border-t border-slate-700/50">
                    <div className="p-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Menang</p>
                      <p className="text-sm font-bold text-emerald-400">{formatCurrency(win)}</p>
                    </div>
                    <div className="p-3 text-center border-x border-slate-700/50">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Kalah</p>
                      <p className="text-sm font-bold text-red-400">{formatCurrency(loss)}</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Net</p>
                      <p className={`text-sm font-bold ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>{net >= 0 ? "+" : ""}{formatCurrency(net)}</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-700/50 p-3">
                    <button onClick={() => openHistory(acc)} className="w-full py-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition">
                      📊 Lihat Riwayat & Tambah Data
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">{editingAccount ? "Edit Akun" : "Tambah Akun Baru"}</h3>
                <button onClick={() => setShowAccountModal(false)} className="p-2 hover:bg-slate-700 rounded-xl transition">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {formError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">{formError}</div>}
              <form onSubmit={handleSaveAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nama Situs</label>
                  <input type="text" value={formSiteName} onChange={(e) => setFormSiteName(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition" placeholder="Contoh: Situs ABC" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Link / URL</label>
                  <input type="text" value={formLink} onChange={(e) => setFormLink(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition" placeholder="https://..." required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                  <input type="text" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition" placeholder="Username akun" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                  <input type="text" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition" placeholder="Password akun" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Catatan (opsional)</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition resize-none" placeholder="Catatan tambahan..." />
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition diesabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? "Menyimpan..." : editingAccount ? "💾 Simpan Perubahan" : "➕ Tambah Akun"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedAccount.siteName}</h3>
                  <p className="text-sm text-slate-400">@{selectedAccount.username}</p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-700 rounded-xl transition">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-emerald-300 uppercase tracking-wider">Menang</p>
                  <p className="text-base sm:text-lg font-bold text-emerald-400">{formatCurrency(Number(selectedAccount.totalWin))}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-red-300 uppercase tracking-wider">Kalah</p>
                  <p className="text-base sm:text-lg font-bold text-red-400">{formatCurrency(Number(selectedAccount.totalLoss))}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${Number(selectedAccount.totalWin) - Number(selectedAccount.totalLoss) >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                  <p className="text-[10px] text-slate-300 uppercase tracking-wider">Net</p>
                  <p className={`text-base sm:text-lg font-bold ${Number(selectedAccount.totalWin) - Number(selectedAccount.totalLoss) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(Number(selectedAccount.totalWin) - Number(selectedAccount.totalLoss))}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <AccountChart key={`ac-${selectedAccount.id}-${historyChartKey}`} accountId={selectedAccount.id} />
              </div>

              <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-semibold text-white mb-3">Tambah Catatan</h4>
                {historyError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg mb-3 text-sm">{historyError}</div>}
                <form onSubmit={handleAddHistory} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setHistoryType("win")}
                      className={`py-2.5 rounded-xl font-semibold text-sm transition ${historyType === "win" ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
                      🏆 Menang
                    </button>
                    <button type="button" onClick={() => setHistoryType("loss")}
                      className={`py-2.5 rounded-xl font-semibold text-sm transition ${historyType === "loss" ? "bg-red-500/20 text-red-400 ring-2 ring-red-500" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
                     💔 Kalah
                    </button>
                  </div>
                  <input type="number" value={historyAmount} onChange={(e) => setHistoryAmount(e.target.value)}
                    placeholder="Jumlah (Rp)" min="1" required
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm" />
                  <input type="text" value={historyDesc} onChange={(e) => setHistoryDesc(e.target.value)}
                    placeholder="Keterangan (opsional)"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm" />
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">📅 Tanggal & Jam</label>
                    <input type="datetime-local" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} required
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm [color-scheme:dark]" />
                  </div>
                  <button type="submit" disabled={submittingHistory}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-60 ${historyType === "win" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-red-500 text-white hover:bg-red-600"}`}>
                    {submittingHistory ? "Menyimpan..." : historyType === "win" ? "🏆 Simpan Kemenangan" : "💔 Simpan Kekalahan"}
                  </button>
                </form>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">Riwayat ({histories.length})</h4>
                  {histories.length > 0 && (
                    <button
                      onClick={handleDeleteAllHistories}
                      className="text-xs text-red-400/70 hover:text-red-400 transition flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Hapus Semua
                    </button>
                  )}
                </div>
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <svg className="animate-spin h-6 w-6 text-emerald-400 mx-auto" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : histories.length === 0 ? (
                  <div className="text-center py-8"><p className="text-slate-500 text-sm">Belum ada riwayat</p></div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {histories.map((h) => (
                      <div key={h.id} className="flex items-center justify-between bg-slate-900/50 rounded-xl px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg flex-shrink-0">{h.type === "win" ? "🏆" : "💔"}</span>
                          <div className="min-w-0">
                            <p className={`font-bold text-sm ${h.type === "win" ? "text-emerald-400" : "text-red-400"}`}>
                              {h.type === "win" ? "+" : "-"}{formatCurrency(Number(h.amount))}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {h.description || (h.type === "win" ? "Kemenangan" : "Kekalahan")}
                            </p>
                            <p className="text-[10px] text-slate-600 mt-0.5">
                              📅 {formatDate(h.date)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteHistory(h)}
                          className="ml-2 p-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/40 rounded-lg text-red-400 transition flex-shrink-0 active:scale-95"
                          title="Hapus riwayat"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Export ke Google Sheets</h3>
                <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-700 rounded-xl transition">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-semibold text-blue-400 mb-2">📋 Cara Export:</h4>
                <ol className="text-xs text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Klik quot;Salin Data Akunquot; atau quot;Salin Riwayatquot;</li>
                  <li>Buka Google Sheet dengan tombol di bawah</li>
                  <li>Klik sel A1 lalu tekan <kbd className="bg-blue-500/20 px-1 py-0.5 rounded text-blue-200">Ctrl+V</kbd></li>
                  <li>Data otomatis terisi rapi!</li>
                </ol>
              </div>
              <div className="space-y-3">
                <button onClick={handleCopyAccounts} className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border transition ${exportCopied === "accounts" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-slate-900/50 border-slate-700/50 text-slate-300 hover:border-emerald-500/30"}`}>
                  <div className="flex items-center gap-3"><span className="text-2xl">📦</span><div className="text-left"><p className="font-semibold text-sm">Salin Data Akun</p><p className="text-xs text-slate-500">Link, username, password, menang, kalah</p></div></div>
                  <span className="text-sm font-medium">{exportCopied === "accounts" ? "✅ Tersalin!" : "📋 Salin"}</span>
                </button>
                <button onClick={handleCopyHistories} className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border transition ${exportCopied === "histories" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-slate-900/50 border-slate-700/50 text-slate-300 hover:border-emerald-500/30"}`}>
                  <div className="flex items-center gap-3"><span className="text-2xl">📊</span><div className="text-left"><p className="font-semibold text-sm">Salin Riwayat Menang/Kalah</p><p className="text-xs text-slate-500">Semua catatan dengan tanggal & jam</p></div></div>
                  <span className="text-sm font-medium">{exportCopied === "histories" ? "✅ Tersalin!" : "📋 Salin"}</span>
                </button>
                <button onClick={handleDownloadCSV} className="w-full flex items-center justify-between px-4 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-300 hover:border-blue-500/30 transition">
                  <div className="flex items-center gap-3"><span className="text-2xl">💾</span><div className="text-left"><p className="font-semibold text-sm">Download CSV</p><p className="text-xs text-slate-500">File CSV bisa di-import ke Google Sheets</p></div></div>
                  <span className="text-sm font-medium">⬇️ Download</span>
                </button>
                <div className="border-t border-slate-700/50 pt-3">
                  <a href={GOOGLE_SHEET_URL} target="\"_blank\"" rel="\"noopener noreferrer\"" className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700text-white px-4 py-3 rounded-xl text-sm font-semibold transition">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zM9 17H6v-3h3v3zm0-5H6V9h3v3zm0-5H6V4h3v3zm5 10h-3v-3h3v3zm0-5h-3V9h3v3zm0-5h-3V4h3v3zm4 10h-3v-3h3v3zm0-5h-3V9h3v3zm0-5h-3V4h3v3z" /></svg>
                    Buka Google Sheet → Paste Data
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}