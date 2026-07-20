import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, histories } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const allAccounts = await db.select().from(accounts).orderBy(desc(accounts.createdAt));
  const allHistories = await db.select().from(histories).orderBy(desc(histories.date));
  const accountRows = allAccounts.map((a) => ({
    id: a.id, siteName: a.siteName, link: a.link,
    username: a.username, password: a.password,
    totalWin: Number(a.totalWin), totalLoss: Number(a.totalLoss),
    net: Number(a.totalWin) - Number(a.totalLoss), notes: a.notes || "",
  }));
  const historyRows = allHistories.map((h) => {
    const acc = allAccounts.find((a) => a.id === h.accountId);
    const d = new Date(h.date);
    const dateStr = d.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
    const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return {
      id: h.id, siteName: acc?.siteName || "Unknown",
      username: acc?.username || "",
      type: h.type === "win" ? "Menang" : "Kalah",
      amount: Number(h.amount), description: h.description || "",
      date: `${dateStr} ${timeStr}`,
    };
  });
  return NextResponse.json({ accounts: accountRows, histories: historyRows });
}