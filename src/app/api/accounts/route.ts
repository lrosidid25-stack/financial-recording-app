import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/db";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: false });
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
    const { siteName, link, username, password, notes } = body;
    if (!siteName || !link || !username || !password) {
      return NextResponse.json({ error: "Nama situs, link, username, dan password wajib diisi" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("accounts")
      .insert({ site_name: siteName, link, username, password, notes: notes || null })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Create account error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, siteName, link, username, password, notes } = body;
    if (!id) { return NextResponse.json({ error: "ID diperlukan" }, { status: 400 }); }
    const { data, error } = await supabase
      .from("accounts")
      .update({ site_name: siteName, link, username, password, notes: notes || null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Update account error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) { return NextResponse.json({ error: "ID diperlukan" }, { status: 400 }); }
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}