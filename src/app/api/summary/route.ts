import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const [result] = await db.select({
    totalAccounts: sql<string>`COUNT(*)`,
    totalWin: sql<string>`COALESCE(SUM(${accounts.totalWin}), 0)`,
    totalLoss: sql<string>`COALESCE(SUM(${accounts.totalLoss}), 0)`,
  }).from(accounts);
  const totalWin = Number(result.totalWin);
  const totalLoss = Number(result.totalLoss);
  return NextResponse.json({
    totalAccounts: Number(result.totalAccounts),
    totalWin, totalLoss,
    netProfit: totalWin - totalLoss,
  });
}