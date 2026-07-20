import { NextResponse } from "next/server";
import { supabase } from "@/db";

export async function GET() {
  try {
    const { data: accounts, error: accErr } = await supabase.from("accounts").select("*");
    if (accErr) throw accErr;
    const { data: histories, error: histErr } = await supabase.from("histories").select("*").order("date", { ascending: false });
    if (histErr) throw histErr;
    // Flatten: map account_id to siteName and username
    const accMap = Object.fromEntries(accounts.map((a: any) => [a.id, { siteName: a.site_name, username: a.username }]));
    const flatHistories = histories.map((h: any) => ({
      id: h.id, accountId: h.account_id, type: h.type,
      amount: Number(h.amount), description: h.description, date: h.date,
      ...(accMap[h.account_id] || { siteName: "", username: "" }),
    }));
    return NextResponse.json({
      accounts: accounts.map((a: any) => ({
        siteName: a.site_name, link: a.link, username: a.username,
        password: a.password, totalWin: Number(a.total_win),
        totalLoss: Number(a.total_loss), net: Number(a.total_win) - Number(a.total_loss),
        notes: a.notes,
      })),
      histories: flatHistories,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ accounts: [], histories: [] });
  }
}