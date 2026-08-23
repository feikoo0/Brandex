import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, key, usuario, password, googleUser } = body;

    const accessCode = (code || key || "").toString().trim();

    // 1. Master Passcodes (Full Brandex Agency Workspace)
    const MASTER_KEYS = ["159789", "842910", "777777", "08e600", "MASTER"];
    
    // 2. Clean / Isolated Workspace Passcodes (Todo en blanco, 0 clientes, 0 proyectos, 0 tareas)
    const CLEAN_KEYS = ["000000", "CLEAN", "GUEST"];

    const createSuccessResponse = (payload: {
      role: string;
      id: string;
      nombre: string;
      workspaceId: string;
      token: string;
    }) => {
      const res = NextResponse.json({ ok: true, ...payload });
      res.cookies.set({
        name: "taski_session",
        value: encodeURIComponent(JSON.stringify(payload)),
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 días
        sameSite: "lax",
      });
      return res;
    };

    // ── Caso A: Login con Google ───────────────────────────────────────────────
    if (googleUser && googleUser.email) {
      const email = googleUser.email.toString().trim().toLowerCase();
      const uid = (googleUser.uid || "").toString().trim();
      const displayName = (googleUser.displayName || "").toString().trim() || "Usuario Taski";

      // A1: Es la cuenta Maestra del Administrador (Feiko)
      if (
        email === "contacto.milenial@gmail.com" ||
        email === "admin@taski.app" ||
        email === "feiko@brandex.com"
      ) {
        return createSuccessResponse({
          role: "admin",
          id: "admin",
          nombre: "Feiko",
          workspaceId: "brandex-master",
          token: `master_google_${uid || "feiko"}`,
        });
      }

      // A2: Buscar si este usuario ya tiene un workspace registrado en Firestore
      try {
        let wsSnap = await getDocs(
          query(collection(db, "workspaces"), where("googleUid", "==", uid))
        );
        if (wsSnap.empty && email) {
          wsSnap = await getDocs(
            query(collection(db, "workspaces"), where("email", "==", email))
          );
        }

        if (!wsSnap.empty) {
          const wsData = wsSnap.docs[0].data();
          return createSuccessResponse({
            role: "admin",
            id: uid || wsData.id,
            nombre: wsData.ownerName || displayName,
            workspaceId: wsData.workspaceId || `ws_${wsData.pin}`,
            token: `token_google_${uid}`,
          });
        }
      } catch (e) {
        console.error("Error buscando workspace de google en Firestore:", e);
      }

      // A3: Es un usuario nuevo con Google -> Retornar isNewUser para disparar el Onboarding
      return NextResponse.json({
        ok: true,
        isNewUser: true,
        email,
        name: displayName,
        googleUid: uid,
      });
    }

    // ── Caso B: Login con PIN / Llave de Acceso ───────────────────────────────
    if (accessCode) {
      // B1: Llave Maestra (Full Brandex data)
      if (MASTER_KEYS.includes(accessCode) || accessCode === (process.env.ADMIN_PASS ?? "08e6003802A")) {
        return createSuccessResponse({
          role: "admin",
          id: "admin",
          nombre: "Feiko",
          workspaceId: "brandex-master",
          token: "master-auth-token",
        });
      }

      // B2: Llave Aislada Demo (Todo en blanco)
      if (CLEAN_KEYS.includes(accessCode)) {
        return createSuccessResponse({
          role: "admin",
          id: "guest_user",
          nombre: "Usuario Taski",
          workspaceId: "isolated_user",
          token: "isolated-auth-token",
        });
      }

      // B3: Buscar si el PIN corresponde a un workspace creado por Onboarding
      if (/^[0-9a-zA-Z]{6}$/.test(accessCode)) {
        try {
          const wsSnap = await getDocs(
            query(collection(db, "workspaces"), where("pin", "==", accessCode))
          );
          if (!wsSnap.empty) {
            const wsData = wsSnap.docs[0].data();
            return createSuccessResponse({
              role: "admin",
              id: wsData.googleUid || `user_${accessCode}`,
              nombre: wsData.ownerName || `Workspace ${accessCode}`,
              workspaceId: wsData.workspaceId || `ws_${accessCode}`,
              token: `token_${accessCode}`,
            });
          }
        } catch (e) {
          console.error("Error buscando PIN en Firestore workspaces:", e);
        }

        // B4: Si no está registrado pero es un formato válido de 6 caracteres, crear/acceder al workspace dinámico
        return createSuccessResponse({
          role: "admin",
          id: `user_${accessCode.toLowerCase()}`,
          nombre: `Workspace ${accessCode}`,
          workspaceId: `ws_${accessCode.toLowerCase()}`,
          token: `token_${accessCode}`,
        });
      }

      return NextResponse.json(
        { ok: false, error: "Llave de acceso no válida" },
        { status: 401 }
      );
    }

    // ── Caso C: Compatibilidad con usuario y contraseña tradicionales ─────────
    if (usuario && password) {
      const adminUser = process.env.ADMIN_USER ?? "Feiko";
      const adminPass = process.env.ADMIN_PASS ?? "08e6003802A";

      const u = usuario.trim();
      const p = password.trim();

      if (
        (u.toLowerCase() === adminUser.trim().toLowerCase() ||
         u.toLowerCase() === "contacto.milenial@gmail.com" ||
         u.toLowerCase() === "admin@taski.app") &&
        p === adminPass.trim()
      ) {
        return createSuccessResponse({
          role: "admin",
          id: "admin",
          nombre: "Feiko",
          workspaceId: "brandex-master",
          token: "master-auth-token",
        });
      }

      return NextResponse.json(
        { ok: false, error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Ingresa tu clave de acceso o continúa con Google" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[/api/login] Error:", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
