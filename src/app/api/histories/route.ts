import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { histories, accounts } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId diperlukan" }, { status: 400 });
  const data = await db.select().from(histories).where(eq(histories.accountId, Number(accountId))).orderBy(desc(histories.date));
  return NextResponse.json(data);
}
export async function POST(request: NextRequest) {
  try {
    const { accountId, type, amount, description, date } = await request.json();
    if (!accountId || !type || !amount) return NextResponse.json({ error: "Field wajib" }, { status: 400 });
    if (type !== "win" && type !== "loss") return NextResponse.json({ error: "Type harus 'win' atau 'loss'" }, { status: 400 });
    const txDate = date ? new Date(date) : new Date();
    const [newHistory] = await db.insert(histories).values({ accountId: Number(accountId), type, amount: String(amount), description: description || null, date: txDate }).returning();
    if (type === "win") {
      await db.update(accounts).set({ totalWin: sql`${accounts.totalWin} + ${String(amount)}`, updatedAt: new Date() }).where(eq(accounts.id, Number(accountId)));
    } else {
      await db.update(accounts).set({ totalLoss: sql`${accounts.totalLoss} + ${String(amount)}`, updatedAt: new Date() }).where(eq(accounts.id, Number(accountId)));
    }
    return NextResponse.json(newHistory, { status: 201 });
  } catch (e) { return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 }); }
}
export async function DELETE(request: NextRequest) {
  try {
    const { id, accountId, type, amount } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    await db.delete(histories).where(and(eq(histories.id, id), eq(histories.accountId, Number(accountId))));
    if (type === "win") {
      await db.update(accounts).set({ totalWin: sql`GREATEST(${accounts.totalWin} - ${String(amount)}, 0)`, updatedAt: new Date() }).where(eq(accounts.id, Number(accountId)));
    } else {
      await db.update(accounts).set({ totalLoss: sql`GREATEST(@$accounts.totalLoss} - ${String(amount)}, 0)`, updatedAt: new Date() }).where(eq(accounts.id, Number(accountId)));
    }
    return NextResponse.json({ success: true });
  } catch (e) { return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 }); }
}