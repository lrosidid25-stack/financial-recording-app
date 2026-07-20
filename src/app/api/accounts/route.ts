/**
 * ============================================================================
 * FILE: src/app/api/accounts/route.ts
 * ============================================================================
 * FUNGSI: API endpoint untuk CRUD (Create, Read, Update, Delete) akun
 * 
 * ENDPOINT: /api/accounts
 * 
 * METHODS:
 *   GET    - Ambil semua akun
 *   POST   - Tambah akun baru
 *   PUT    - Update akun existing
 *   DELETE - Hapus akun
 * 
 * DIGUNAKAN OLEH:
 *   - src/app/page.tsx (fetchData, handleSaveAccount, handleDeleteAccount)
 * 
 * TERHUBUNG DENGAN:
 *   - src/db/index.ts     (koneksi database)
 *   - src/db/schema.ts    (tabel accounts)
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";                    // Koneksi database
import { accounts } from "@/db/schema";       // Tabel accounts
import { desc, eq } from "drizzle-orm";       // Helper untuk query

/**
 * GET /api/accounts
 * ------------------
 * Mengambil semua akun dari database
 * 
 * Response: Array of accounts, diurutkan dari terbaru
 */
export async function GET() {
  const data = await db
    .select()
    .from(accounts)
    .orderBy(desc(accounts.createdAt));
  return NextResponse.json(data);
}

/**
 * POST /api/accounts
 * -------------------
 * Menambah akun baru
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteName, link, username, password, notes } = body;
    if (!siteName || !link || !username || !password) {
      return NextResponse.json({ error: "Nama situs, link, username, dan password wajib diisi" }, { status: 400 });
    }
    const [newAccount] = await db.insert(accounts).values({ siteName, link, username, password, notes: notes || null }).returning();
    return NextResponse.json(newAccount, { status: 201 });
  } catch (error) {
    console.error("Create account error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

/**
 * PUT /api/accounts
 * ------------------
 * Update akun existing
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, siteName, link, username, password, notes } = body;
    if (!id) { return NextResponse.json({ error: "ID diperlukan" }, { status: 400 }); }
    const [updated] = await db.update(accounts).set({ siteName, link, username, password, notes: notes || null, updatedAt: new Date() }).where(eq(accounts.id, id)).returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update account error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

/**
 * DELETE /api/accounts
 * ---------------------
 * Hapus akun (beserta semua riwayatnya karena CASCADE)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) { return NextResponse.json({ error: "ID diperlukan" }, { status: 400 }); }
    await db.delete(accounts).where(eq(accounts.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}