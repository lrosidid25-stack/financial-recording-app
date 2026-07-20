import { NextResponse } from "next/server";
import { supabase } from "@/db";

export async function GET() {
  try {
    const { data: accounts, error: accErr } = await supabase.from("accounts").select("id,site_name");
    if (accErr) throw accErr;
    const { data: histories, error: histErr } = await supabase.from("histories").select("*").order("date", { ascending: true });
    if (histErr) throw histErr;
    return NextResponse.json({ accounts, histories });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ accounts: [], histories: [] });
  }
}
