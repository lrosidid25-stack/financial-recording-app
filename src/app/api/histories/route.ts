import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    if (!accountId) { return NextResponse.json([]); }
    const { data, error } = await supabase
      .from("histories")
      .select("*")
      .eq("account_id", Number(accountId))
      .order("date", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, type, amount, description, date } = body;
    if (!accountId || !type || !amount) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    const { data: hData, error: hErr } = await supabase
      .from("histories")
      .insert({ account_id: accountId, type, amount: Number(amount), description: description || null, date: date || new Date().toISOString() })
      .select()
      .single();
    if (hErr) throw hErr;
    const field = type === "win" ? "total_win" : "total_loss";
    const { data: accData } = await supabase
      .from("accounts")
      .select(field)
      .eq("id", accountId)
      .single();
    if (accData) {
      const current = Number(accData[field]) || 0;
      await supabase
        .from("accounts")
        .update({ [field]: Number((current + Number(amount)).toFixed(2)), updated_at: new Date().toISOString() })
        .eq("id", accountId);
    }
    return NextResponse.json(hData, { status: 201 });
  } catch (error) {
    console.error("Create history error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, accountId, type, amount } = body;
    if (!id || !accountId || !type || !amount) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    const { error } = await supabase.from("histories").delete().eq("id", id);
    if (error) throw error;
    const field = type === "win" ? "total_win" : "total_loss";
    const { data: accData } = await supabase
      .from("accounts")
      .select(field)
      .eq("id", accountId)
      .single();
    if (accData) {
      const current = Number(accData[field]) || 0;
      const newVal = Math.max(0, current - Number(amount));
      await supabase
        .from("accounts")
        .update({ [field]: Number(newVal.toFixed(2)), updated_at: new Date().toISOString() })
        .eq("id", accountId);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete history error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}