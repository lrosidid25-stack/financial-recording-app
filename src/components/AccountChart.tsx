/**
 * ============================================================================
 * FILE: src/components/AccountChart.tsx
 * ============================================================================
 * FUNGSI: Komponen grafik per akun (data harian)
 * 
 * MENAMPILKAN:
 *   - Tab "Bar": Bar chart menang vs kalah per hari
 *   - Tab "Profit": Area chart profit kumulatif
 * 
 * PROPS:
 *   - accountId: number (ID akun yang ingin ditampilkan grafiknya)
 * 
 * DIGUNAKAN OLEH:
 *   - src/app/page.tsx (di dalam modal riwayat)
 * 
 * MEMANGGIL API:
 *   - GET /api/charts?accountId=X
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
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Data harian dari API */
interface DailyData {
  date: string;        // Format: "2025-01-15"
  win: number;         // Total menang hari ini
  loss: number;        // Total kalah hari ini
  net: number;         // win - loss
  cumulative: number;  // Total profit dari awal sampai hari ini
}

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
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-2.5 shadow-xl text-xs">
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

/**
 * AccountChart
 * -------------
 * Menampilkan grafik untuk satu akun tertentu
 * 
 * @param accountId - ID akun yang grafiknya ingin ditampilkan
 * 
 * Contoh penggunaan:
 *   <AccountChart accountId={1} />
 *   <AccountChart key={`chart-${id}-${refreshKey}`} accountId={id} />
 * 
 * Tips: Gunakan key yang berubah untuk memaksa refresh data
 */
export default function AccountChart({ accountId }: { accountId: number }) {
  // State untuk data
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk tab aktif
  const [tab, setTab] = useState<"bar" | "area">("bar");

  /**
   * fetchChart
   * -----------
   * Mengambil data grafik dari API untuk akun ini
   */
  const fetchChart = useCallback(async () => {
    try {
      const res = await fetch(`/api/charts?accountId=${accountId}`);
      const data = await res.json();
      setDaily(data.daily || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  // Fetch data saat mount atau accountId berubah
  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  // ============================================================================
  // RENDER: Loading state
  // ============================================================================
  if (loading) {
    return (
      <div className="animate-pulse flex items-center justify-center h-32">
        <p className="text-slate-500 text-xs">Memuat grafik...</p>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Empty state
  // ============================================================================
  if (daily.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-slate-500 text-xs">📊 Grafik muncul setelah ada riwayat</p>
      </div>
    );
  }

  // Format label tanggal: "2025-01-15" → "15 Jan"
  const formatted = daily.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("id-ID", { 
      day: "2-digit", 
      month: "short" 
    }),
  }));

  // ============================================================================
  // RENDER: Main component
  // ============================================================================
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
      {/* Header dengan tab toggle */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">📊 Grafik</h4>
        
        {/* Tab buttons */}
        <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setTab("bar")}
            className={`px-2 py-1 rounded-md transition ${
              tab === "bar" ? "bg-slate-700 text-white" : "text-slate-400"
            }`}
          >
            Bar
          </button>
          <button
            onClick={() => setTab("area")}
            className={`px-2 py-1 rounded-md transition ${
              tab === "area" ? "bg-slate-700 text-white" : "text-slate-400"
            }`}
          >
            Profit
          </button>
        </div>
      </div>

      {/* ================================================================
          TAB 1: Bar Chart - Daily Win vs Loss
          ================================================================ */}
      {tab === "bar" ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={formatted} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="win" name="Menang" fill="#34d399" radius={[3, 3, 0, 0]} />
            <Bar dataKey="loss" name="Kalah" fill="#f87171" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        /* ================================================================
           TAB 2: Area Chart - Cumulative Profit
           ================================================================ */
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={formatted}>
            {/* Gradient fill untuk area */}
            <defs>
              <linearGradient id={`grad-${accountId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="cumulative" 
              name="Profit" 
              stroke="#fbbf24" 
              strokeWidth={2} 
              fill={`url(#grad-${accountId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
