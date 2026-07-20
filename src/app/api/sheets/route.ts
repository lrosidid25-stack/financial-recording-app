import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteName, link, username, password, notes } = body;
    if (!siteName || !link || !username || !password) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    const { error } = await supabase.from("sheets_sync").insert({
      site_name: siteName,
      link,
      username,
      password,
      notes: notes || null,
      synced: false,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, message: "Data akan disync ke Google Sheets" });
  } catch (error) {
    console.error("Sheets sync error:", error);
    return NextResponse.json({ error: "Gagal sync ke Google Sheets" }, { status: 500 });
  }
}
