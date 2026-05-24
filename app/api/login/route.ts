import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { usuario, password } = await req.json();

    if (!usuario || !password) {
      return NextResponse.json({ ok: false, error: "Faltan usuario o contraseña" }, { status: 400 });
    }

    const adminUser = process.env.ADMIN_USER ?? "Feiko";
    const adminPass = process.env.ADMIN_PASS ?? "08e6003802A";

    const u = usuario.trim();
    const p = password.trim();

    if (u.toLowerCase() === adminUser.trim().toLowerCase() && p === adminPass.trim()) {
      return NextResponse.json({ ok: true, role: "admin", id: "admin", nombre: u, token: "" });
    }

    return NextResponse.json({ ok: false, error: "Usuario o contraseña incorrectos" }, { status: 401 });
  } catch (err) {
    console.error("[/api/login] Error:", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
