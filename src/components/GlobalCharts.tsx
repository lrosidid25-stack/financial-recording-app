/**
 * ============================================================================
 * FILE: src/components/GlobalCharts.tsx
 * ============================================================================
 * FUNGSI: Komponen grafik global (semua akun)
 * 
 * MENAMPILKAN:
 *   - Tab "Bulanan": Bar chart menang vs kalah per bulan
 *   - Tab "Profit": Line chart profit kumulatif
 *   - Tab "Per Akun": Bar + Pie chart perbandingan antar akun
 * 
 * DIGUNAKAN OLEH:
 *   - src/app/page.tsx (di bawah summary cards)
 * 
 * MEMANGGIL API:
 *   - GET /api/charts (tanpa parameter)
 * 
 * LIBRARY:
 *   - recharts (untuk grafik)
 * ============================================================================
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency, formatMonthYear } from "@/lib/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Data bulanan dari API */
interface MonthlyData {
  month: string;       // Format: "2025-01"
  win: number;         // Total menang bulan ini
  loss: number;        // Total kalah bulan ini
  net: number;         // win - loss
  cumulative: number;  // Total profit dari awal sampai bulan ini
}

/** Data per akun dari API */
interface AccountData {
  name: string;        // Nama situs
  win: number;         // Total menang
  loss: number;        // Total kalah
  net: number;         // win - loss
}

// Warna untuk grafik
const COLORS_WIN = ["#34d399", "#10b981", "#059669", "#047857", "#065f46"];
const COLORS_LOSS = ["#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b"];

// ============================================================================
// CUSTOM TOOLTIP COMPONENT
// ============================================================================

/**
 * CustomTooltip
 * --------------
 * Tooltip kustom untuk grafik, menampilkan nilai dalam format Rupiah
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl text-xs">
      <p className="text-slate-300 font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GlobalCharts() {
  // State untuk data
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [accountData, setAccountData] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk tab aktif
  const [activeTab, setActiveTab] = useState<"bar" | "line" | "accounts">("bar");

  /**
   * fetchCharts
   * ------------
   * Mengambil data grafik dari API
   * Dipanggil saat komponen mount dan saat key berubah
   */
  const fetchCharts = useCallback(async () => {
    try {
      const res = await fetch("/api/charts");
      const data = await res.json();
      setMonthly(data.monthly || []);
      setAccountData(data.accounts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data saat mount
  useEffect(() => {
    fetchCharts();
  }, [fetchCharts]);

  // ============================================================================
  // RENDER: Loading state
  // ============================================================================
  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur">
        <div className="animate-pulse flex items-center justify-center h-48">
          <p className="text-slate-500 text-sm">Memuat grafik...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Empty state
  // ============================================================================
  if (monthly.length === 0 && accountData.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur text-center">
        <p className="text-slate-500 text-sm">
          📊 Grafik akan muncul setelah ada data riwayat menang/kalah
        </p>
      </div>
    );
  }

  // Format label bulan: "2025-01" → "Jan 2025"
  const monthlyFormatted = monthly.map((m) => ({
    ...m,
    label: formatMonthYear(m.month),
  }));

  // Data untuk pie chart (total win vs loss)
  const totalWin = accountData.reduce((sum, a) => sum + a.win, 0);
  const totalLoss = accountData.reduce((sum, a) => sum + a.loss, 0);
  const pieData = [
    { name: "Menang", value: totalWin },
    { name: "Kalah", value: totalLoss },
  ].filter((d) => d.value > 0);

  // ============================================================================
  // RENDER: Main component
  // ============================================================================
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl backdrop-blur overflow-hidden">
      {/* Header dengan tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📊 Grafik Global
          </h2>
          
          {/* Tab buttons */}
          <div className="flex bg-slate-900/50 rounded-xl p-1 text-xs sm:text-sm">
            <button
              onClick={() => setActiveTab("bar")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === "bar"
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📊 Bulanan
            </button>
            <button
              onClick={() => setActiveTab("line")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === "line"
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📈 Profit
            </button>
            <button
              onClick={() => setActiveTab("accounts")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === "accounts"
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🏦 Per Akun
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* ================================================================
            TAB 1: Bar Chart - Monthly Win vs Loss
            ================================================================ */}
        {activeTab === "bar" && (
          <div>
            <p className="text-xs text-slate-400 mb-4">Menang vs Kalah per Bulan</p>
            {monthlyFormatted.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-12">Belum ada data bulanan</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyFormatted} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                    formatter={(value) => <span className="text-slate-300">{value}</span>}
                  />
                  <Bar dataKey="win" name="🏆 Menang" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="loss" name="💔 Kalah" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 2: Line Chart - Cumulative Profit
            ================================================================ */}
        {activeTab === "line" && (
          <div>
            <p className="text-xs text-slate-400 mb-4">Perkembangan Profit Kumulatif</p>
            {monthlyFormatted.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-12">Belum ada data</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value) => <span className="text-slate-300">{value}</span>}
                  />
                  <Line type="monotone" dataKey="cumulative" name="💰 Profit" stroke="#fbbf24" strokeWidth={3} dot={{ fill: "#fbbf24", r: 5 }} />
                  <Line type="monotone" dataKey="net" name="📊 Net Bulanan" stroke="#818cf8" strokeWidth={2} dot={{ fill: "#818cf8", r: 4 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 3: Per Account Comparison
            ================================================================ */}
        {activeTab === "accounts" && (
          <div>
            <p className="text-xs text-slate-400 mb-4">Perbandingan Antar Akun</p>
            {accountData.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-12">Belum ada data akun</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar chart horizontal */}
                <div>
                  <p className="text-xs text-slate-500 mb-2 text-center">Menang vs Kalah per Akun</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={accountData} layout="vertical" barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="win" name="Menang" fill="#34d399" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="loss" name="Kalah" fill="#f87171" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie chart */}
                <div>
                  <p className="text-xs text-slate-500 mb-2 text-center">Rasio Menang vs Kalah</p>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }: { name?: string; percent?: number }) => `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          {pieData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? COLORS_WIN[0] : COLORS_LOSS[0]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-slate-500 text-sm py-12">Belum ada data</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
