import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { histories, accounts } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  if (accountId) {
    const dailyData = await db.select({ date: sql<string>`TO_CHAR(${histories.date}, 'YYYY-MM-DD')`, type: histories.type, total: sql<string>`SUM(${histories.amount})`, count: sql<string>`COUNT(*)` }).from(histories).where(eq(histories.accountId, Number(accountId))).groupBy(sql`TO_CHAR(${histories.date}, 'YYYY-MM-DD')`, histories.type).orderBy(sql`TO_CHAR(${histories.date}, 'YYYY-MM-DD')`);
    const dayMap = new Map();
    for (const row of dailyData) {
      const existing = dayMap.get(row.date) || { date: row.date, win: 0, loss: 0, net: 0 };
      if (row.type === "win") existing.win = Number(row.total); else existing.loss = Number(row.total);
      existing.net = existing.win - existing.loss;
      dayMap.set(row.date, existing);
    }
    const daily = Array.from(dayMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    const chartData = daily.map(d => { cumulative += d.net; return { ...d, cumulative }; });
    return NextResponse.json({ daily: chartData });
  }
  const monthlyData = await db.select({ month: sql<string>`TO_CHAR(${histories.date}, 'YYYY-MM')`, type: histories.type, total: sql<string>`SUM(${histories.amount})` }).from(histories).groupBy(sql`TO_CHAR(${histories.date}, 'YYYY-MM')`, histories.type).orderBy(sql`TO_CHAR(${histories.date}, 'YYYY-MM')`);
  const monthMap = new Map();
  for (const row of monthlyData) {
    const existing = monthMap.get(row.month) || { month: row.month, win: 0, loss: 0, net: 0 };
    if (row.type === "win") existing.win = Number(row.total); else existing.loss = Number(row.total);
    existing.net = existing.win - existing.loss;
    monthMap.set(row.month, existing);
  }
  const monthly = Array.from(monthMap.values()).sort((a,b) => a.month.localeCompare(b.month));
  let cum = 0;
  const globalChart = monthly.map(m => { cum += m.net; return { ...m, cumulative: cum }; });
  const accountStats = await db.select({ id: accounts.id, siteName: accounts.siteName, totalWin: accounts.totalWin, totalLoss: accounts.totalLoss }).from(accounts).orderBy(desc(accounts.createdAt));
  const accountChart = accountStats.map(a => ({ name: a.siteName, win: Number(a.totalWin), loss: Number(a.totalLoss), net: Number(a.totalWin) - Number(a.totalLoss) }));
  return NextResponse.json({ monthly: globalChart, accounts: accountChart });
}