import { NextResponse } from "next/server";
import { supabase } from "@/db";

export async function GET() {
  try {
    const { data: accounts, error } = await supabase.from("accounts").select("total_win,total_loss");
    if (error) throw error;
    const totalAccounts = accounts.length;
    const totalWin = accounts.reduce((s: number, a: any) => s + Number(a.total_win || 0), 0);
    const totalLoss = accounts.reduce((s: number, a: any) => s + Number(a.total_loss || 0), 0);
    return NextResponse.json({ totalAccounts, totalWin, totalLoss, netProfit: totalWin - totalLoss });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ totalAccounts: 0, totalWin: 0, totalLoss: 0, netProfit: 0 });
  }
}
