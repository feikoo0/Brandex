import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, doc, setDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Generar PIN único de 6 dígitos aleatorio
function generateUniquePin(): string {
  const digits = Math.floor(100000 + Math.random() * 900000).toString();
  return digits;
}

const RESERVED_PINS = ["159789", "842910", "777777", "08e600", "000000", "123456"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      companyName = "",
      workspaceName = "",
      brandName = "",
      email = "",
      googleUid = "",
      specialty = "",
      useCases = [],
      teamSize = "1",
      industry = "",
      members = [],
      brandLinks = [],
      brandFiles = [],
    } = body;

    const resolvedCompanyName = (companyName || brandName || name || "Mi Empresa").toString().trim();
    const resolvedWorkspaceName = (workspaceName || resolvedCompanyName || "Mi Workspace").toString().trim();
    const trimmedName = (name || resolvedCompanyName || "Usuario Taski").toString().trim();
    const trimmedEmail = (email || "").toString().trim().toLowerCase();

    // 1. Generar PIN de 6 dígitos único
    let pin = generateUniquePin();
    let isCollision = true;
    let attempts = 0;

    while (isCollision && attempts < 10) {
      attempts++;
      if (RESERVED_PINS.includes(pin)) {
        pin = generateUniquePin();
        continue;
      }
      try {
        const existingPinSnap = await getDocs(
          query(collection(db, "workspaces"), where("pin", "==", pin))
        );
        if (existingPinSnap.empty) {
          isCollision = false;
        } else {
          pin = generateUniquePin();
        }
      } catch {
        isCollision = false;
      }
    }

    const workspaceId = `ws_${pin}`;
    const now = new Date();

    // 2. Guardar Workspace en Firestore
    const wsRef = doc(db, "workspaces", workspaceId);
    await setDoc(wsRef, {
      id: workspaceId,
      workspaceId,
      pin,
      name: resolvedWorkspaceName,
      workspaceName: resolvedWorkspaceName,
      companyName: resolvedCompanyName,
      brandName: resolvedCompanyName,
      brand: resolvedCompanyName,
      ownerName: trimmedName,
      email: trimmedEmail,
      googleUid: googleUid.trim(),
      specialty: specialty || "General",
      useCases,
      goals: useCases,
      teamSize,
      industry: industry || "General",
      brandLinks: Array.isArray(brandLinks) ? brandLinks : [],
      brandFiles: Array.isArray(brandFiles) ? brandFiles : [],
      createdAt: serverTimestamp(),
      created_at: now.toISOString(),
      updatedAt: serverTimestamp(),
      updated_at: now.toISOString(),
      submittedAt: serverTimestamp(),
      submitted_at: now.toISOString(),
    });

    // 3. Crear Cliente de Marca Propia en Firestore (Single Source of Truth)
    try {
      const scopedClientsCol = `${workspaceId}_clients`;
      const clientId = `client_${Date.now()}`;
      const hue = Math.floor(Math.random() * 360);
      const clientDoc = {
        id: clientId,
        nombre: resolvedCompanyName,
        name: resolvedCompanyName,
        workspaceId,
        workspace_id: workspaceId,
        color: `hsl(${hue}, 80%, 60%)`,
        customColor: { h: hue, s: 80, l: 60 },
        esMarcaPropia: true,
        status: "Activo",
        industria: industry || "General",
        drive_links: Array.isArray(brandLinks) ? brandLinks : [],
        createdAt: serverTimestamp(),
        created_at: now.toISOString(),
        updatedAt: serverTimestamp(),
        updated_at: now.toISOString(),
      };
      await setDoc(doc(db, scopedClientsCol, clientId), clientDoc);
    } catch (cErr) {
      console.error("Error creating initial brand client:", cErr);
    }

    // 4. Crear Colaboradores (Owner + Miembros Invitados)
    try {
      const scopedMembersCol = `${workspaceId}_members`;
      const ownerMemberId = `member_${pin}_owner`;
      await setDoc(doc(db, scopedMembersCol, ownerMemberId), {
        id: ownerMemberId,
        nombre: trimmedName,
        name: trimmedName,
        email: trimmedEmail,
        rol: "Admin",
        status: "Activo",
        workspaceId,
        workspace_id: workspaceId,
        createdAt: serverTimestamp(),
        created_at: now.toISOString(),
        updatedAt: serverTimestamp(),
        updated_at: now.toISOString(),
      });

      if (Array.isArray(members) && members.length > 0) {
        for (let i = 0; i < members.length; i++) {
          const mEmail = String(members[i]).trim().toLowerCase();
          if (!mEmail || mEmail === trimmedEmail) continue;
          const mId = `member_${pin}_${i + 1}`;
          await setDoc(doc(db, scopedMembersCol, mId), {
            id: mId,
            nombre: mEmail.split("@")[0] || `Miembro ${i + 1}`,
            email: mEmail,
            rol: "Colaborador",
            status: "Invitado",
            workspaceId,
            workspace_id: workspaceId,
            createdAt: serverTimestamp(),
            created_at: now.toISOString(),
            updatedAt: serverTimestamp(),
            updated_at: now.toISOString(),
          });
        }
      }
    } catch (mErr) {
      console.error("Error registering initial members:", mErr);
    }

    // 5. Guardar Contexto de Brand AI en Firestore
    try {
      const aiCtxRef = doc(db, "workspace_ai_context", workspaceId);
      await setDoc(aiCtxRef, {
        workspaceId,
        companyName: resolvedCompanyName,
        workspaceName: resolvedWorkspaceName,
        industry: industry || "General",
        brandLinks: Array.isArray(brandLinks) ? brandLinks : [],
        brandFiles: Array.isArray(brandFiles) ? brandFiles : [],
        systemPromptNotes: `Marca: ${resolvedCompanyName}. Industria: ${industry || "General"}. Enlaces: ${brandLinks.join(", ")}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (aiErr) {
      console.error("Error creating AI context:", aiErr);
    }

    // 6. Guardar Respuestas de Encuesta en Firestore (Trazabilidad)
    const surveyId = `survey_${pin}_${Date.now()}`;
    const surveyRef = doc(db, "onboarding_surveys", surveyId);
    await setDoc(surveyRef, {
      id: surveyId,
      pin,
      workspaceId,
      name: trimmedName,
      ownerName: trimmedName,
      companyName: resolvedCompanyName,
      workspaceName: resolvedWorkspaceName,
      brandName: resolvedCompanyName,
      brand: resolvedCompanyName,
      email: trimmedEmail,
      googleUid: googleUid.trim(),
      specialty: specialty || "General",
      useCases,
      goals: useCases,
      teamSize,
      industry: industry || "General",
      membersCount: Array.isArray(members) ? members.length : 0,
      linksCount: Array.isArray(brandLinks) ? brandLinks : 0,
      createdAt: serverTimestamp(),
      created_at: now.toISOString(),
      submittedAt: serverTimestamp(),
      submitted_at: now.toISOString(),
    });

    // 4. Crear cookie de sesión para acceso inmediato
    const payload = {
      role: "admin",
      id: googleUid.trim() || `user_${pin}`,
      nombre: trimmedName,
      workspaceId,
      token: `token_${pin}`,
    };

    const res = NextResponse.json({
      ok: true,
      pin,
      ...payload,
    });

    res.cookies.set({
      name: "taski_session",
      value: encodeURIComponent(JSON.stringify(payload)),
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 días
      sameSite: "lax",
    });

    return res;
  } catch (err) {
    console.error("[/api/workspace/create] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error al crear el espacio de trabajo" },
      { status: 500 }
    );
  }
}
