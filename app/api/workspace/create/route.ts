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
      brandName = "",
      email = "",
      googleUid = "",
      specialty = "",
      useCases = [],
      teamSize = "1",
    } = body;

    const trimmedName = (name || "").toString().trim() || "Usuario Taski";
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
      name: trimmedName,
      ownerName: trimmedName,
      brandName: brandName.trim(),
      brand: brandName.trim(),
      email: trimmedEmail,
      googleUid: googleUid.trim(),
      specialty,
      useCases,
      goals: useCases,
      teamSize,
      createdAt: serverTimestamp(),
      created_at: now.toISOString(),
      submittedAt: serverTimestamp(),
      submitted_at: now.toISOString(),
    });

    // 3. Guardar Respuestas de Encuesta en Firestore
    const surveyId = `survey_${pin}_${Date.now()}`;
    const surveyRef = doc(db, "onboarding_surveys", surveyId);
    await setDoc(surveyRef, {
      id: surveyId,
      pin,
      workspaceId,
      name: trimmedName,
      ownerName: trimmedName,
      brandName: brandName.trim(),
      brand: brandName.trim(),
      email: trimmedEmail,
      googleUid: googleUid.trim(),
      specialty,
      useCases,
      goals: useCases,
      teamSize,
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
