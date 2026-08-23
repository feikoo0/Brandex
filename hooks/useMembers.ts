"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  Timestamp,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordUndoAction } from "@/lib/undoManager";
import type { Member, DriveLink } from "@/lib/types";

export const INITIAL_MEMBERS: Member[] = [
  {
    id: "mem-1",
    nombre: "Carlos Mendoza",
    name: "Carlos Mendoza",
    rol: "Lead UI/UX & Spatial Design",
    role: "Lead UI/UX & Spatial Design",
    email: "carlos.mendoza@taski.io",
    avatar: "CM",
    specialty: "Diseño",
    color: "hsl(217, 91%, 60%)",
    colorName: "Azul Eléctrico",
    skills: ["Figma", "Spatial UI", "Glassmorphism", "Design Systems"],
    proyectos_asignados: ["1", "2"],
    drive_links: [
      { id: "dl-1", label: "Figma UI Master", url: "https://drive.google.com" },
      { id: "dl-2", label: "Iconografía 3D", url: "https://drive.google.com" }
    ],
    disponibilidad: "En Proyecto",
    status: "En Proyecto",
    statusColor: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    notas_internas: "Especialista en interfaces espaciales y micro-interacciones. Alta velocidad de ejecución.",
    bio: "Especialista en interfaces tridimensionales y design systems de alta gama.",
    telefono: "+52 55 1234 5678",
    tarifa_hora: 45,
    rating: "4.9",
    completedTasks: 42,
    totalHoursLogged: 168,
    workloadPercent: 85,
  },
  {
    id: "mem-2",
    nombre: "Sofía Valenzuela",
    name: "Sofía Valenzuela",
    rol: "Motion Director & 3D Artist",
    role: "Motion Director & 3D Artist",
    email: "sofia.valenzuela@taski.io",
    avatar: "SV",
    specialty: "Animación",
    color: "hsl(271, 91%, 65%)",
    colorName: "Púrpura",
    skills: ["After Effects", "Blender", "Three.js", "WebGL", "Framer"],
    proyectos_asignados: ["1", "3"],
    drive_links: [
      { id: "dl-3", label: "Renders 3D Assets", url: "https://drive.google.com" }
    ],
    disponibilidad: "En Proyecto",
    status: "En Proyecto",
    statusColor: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    notas_internas: "Dirección de animación y renderizado hiperrealista. Encargada de piezas clave.",
    bio: "Directora de animación y shaders 3D para web y experiencias de producto.",
    telefono: "+52 55 8765 4321",
    tarifa_hora: 50,
    rating: "5.0",
    completedTasks: 38,
    totalHoursLogged: 210,
    workloadPercent: 92,
  },
  {
    id: "mem-3",
    nombre: "Mateo Ríos",
    name: "Mateo Ríos",
    rol: "Video Producer & Editor",
    role: "Video Producer & Editor",
    email: "mateo.rios@taski.io",
    avatar: "MR",
    specialty: "Video",
    color: "hsl(142, 70%, 45%)",
    colorName: "Esmeralda",
    skills: ["Premiere Pro", "DaVinci Resolve", "Color Grading", "Sound Design"],
    proyectos_asignados: ["2"],
    drive_links: [
      { id: "dl-4", label: "Carpetas de Brutos", url: "https://drive.google.com" }
    ],
    disponibilidad: "Disponible",
    status: "Disponible",
    statusColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    notas_internas: "Edición cinematográfica y color grading. Capacidad para tomar proyectos urgentes.",
    bio: "Edición cinematográfica, etalonaje digital de alta gama y composición sonora.",
    telefono: "+52 55 2468 1357",
    tarifa_hora: 35,
    rating: "4.8",
    completedTasks: 29,
    totalHoursLogged: 135,
    workloadPercent: 45,
  },
  {
    id: "mem-4",
    nombre: "Elena Rostova",
    name: "Elena Rostova",
    rol: "Growth & Campaign Strategist",
    role: "Growth & Campaign Strategist",
    email: "elena.rostova@taski.io",
    avatar: "ER",
    specialty: "Marketing",
    color: "hsl(25, 95%, 50%)",
    colorName: "Naranja Vibrante",
    skills: ["Brand Strategy", "SEO/SEM", "Conversion Funnels", "Analytics"],
    proyectos_asignados: ["3"],
    drive_links: [
      { id: "dl-5", label: "Reportes de Campaña", url: "https://drive.google.com" }
    ],
    disponibilidad: "En Proyecto",
    status: "En Proyecto",
    statusColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    notas_internas: "Estrategia de posicionamiento de marca y embudos de conversión.",
    bio: "Especialista en estrategia de marcas y adquisición pagada con alto ROAS.",
    telefono: "+52 55 9876 5432",
    tarifa_hora: 40,
    rating: "4.9",
    completedTasks: 51,
    totalHoursLogged: 195,
    workloadPercent: 78,
  },
  {
    id: "mem-5",
    nombre: "Lucas Silva",
    name: "Lucas Silva",
    rol: "Senior Frontend Engineer",
    role: "Senior Frontend Engineer",
    email: "lucas.silva@taski.io",
    avatar: "LS",
    specialty: "Desarrollo",
    color: "hsl(180, 90%, 50%)",
    colorName: "Cyan Brillante",
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Three.js"],
    proyectos_asignados: ["1", "2", "3"],
    drive_links: [
      { id: "dl-6", label: "Repositorio & CI", url: "https://drive.google.com" }
    ],
    disponibilidad: "Carga Máxima",
    status: "Carga Máxima",
    statusColor: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    notas_internas: "Desarrollo de interfaces complejas y optimización de rendimiento.",
    bio: "Arquitectura frontend, visualizadores interactivos y performance web.",
    telefono: "+52 55 3691 2580",
    tarifa_hora: 55,
    rating: "4.9",
    completedTasks: 47,
    totalHoursLogged: 240,
    workloadPercent: 96,
  }
];

import { useAuthStore } from "@/lib/store";

export function useMembers() {
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";

  const [members, setMembers] = useState<Member[]>(isMaster ? INITIAL_MEMBERS : []);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Real-time listener for Firestore collection "members" (or workspace collection)
  useEffect(() => {
    if (!workspaceId) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    const colName = isMaster ? "members" : `ws_${workspaceId}_members`;
    const colRef = collection(db, colName);

    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          if (!isMaster) {
            setMembers([]);
            setIsLoading(false);
            return;
          }
          try {
            // Check if legacy "v3_members" has documents to migrate
            const legacySnap = await getDocs(collection(db, "v3_members"));
            if (!legacySnap.empty) {
              const migrationPromises = legacySnap.docs.map((d) =>
                setDoc(doc(db, "members", d.id), {
                  ...d.data(),
                  createdAt: d.data().createdAt || d.data().created_at || serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  created_at: d.data().created_at || d.data().createdAt || serverTimestamp(),
                  updated_at: serverTimestamp(),
                })
              );
              await Promise.all(migrationPromises);
            } else {
              const seedPromises = INITIAL_MEMBERS.map((m) =>
                setDoc(doc(db, "members", String(m.id)), {
                  ...m,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  created_at: serverTimestamp(),
                  updated_at: serverTimestamp(),
                })
              );
              await Promise.all(seedPromises);
            }
            setMembers(INITIAL_MEMBERS);
          } catch (seedErr) {
            console.error("Error seeding initial members:", seedErr);
            setMembers(INITIAL_MEMBERS);
          }
        } else {
          const list: Member[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as Member;
            list.push({
              ...data,
              id: d.id,
              nombre: data.nombre || data.name || "Miembro sin nombre",
              rol: data.rol || data.role || "Especialista",
              skills: data.skills || [],
              proyectos_asignados: data.proyectos_asignados || [],
              drive_links: data.drive_links || [],
              disponibilidad: data.disponibilidad || data.status || "Disponible",
              status: data.status || data.disponibilidad || "Disponible",
              color: data.color || "",
              colorName: data.colorName || "",
              customColor: data.customColor,
              notas_internas: data.notas_internas || "",
              createdAt: data.createdAt || data.created_at || null,
              updatedAt: data.updatedAt || data.updated_at || null,
              created_at: data.created_at || data.createdAt || null,
              updated_at: data.updated_at || data.updatedAt || null,
            });
          });
          setMembers(list);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error subscribing to members in Firestore:", err);
        setMembers(INITIAL_MEMBERS);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const createMember = useCallback(async (data: Partial<Member>): Promise<string> => {
    const newId = "mem-" + Date.now();
    const newMember: Member = {
      id: newId,
      nombre: data.nombre || data.name || "Nuevo Miembro",
      name: data.nombre || data.name || "Nuevo Miembro",
      rol: data.rol || data.role || "Especialista",
      role: data.rol || data.role || "Especialista",
      email: data.email || "",
      avatar: data.avatar || data.nombre?.slice(0, 2).toUpperCase() || "NM",
      specialty: data.specialty || "Diseño",
      color: data.color || "",
      colorName: data.colorName || "",
      customColor: data.customColor,
      skills: data.skills || [],
      proyectos_asignados: data.proyectos_asignados || [],
      drive_links: data.drive_links || [],
      disponibilidad: data.disponibilidad || "Disponible",
      status: data.status || data.disponibilidad || "Disponible",
      notas_internas: data.notas_internas || "",
      telefono: data.telefono || "",
      tarifa_hora: data.tarifa_hora || 40,
      rating: "5.0",
      completedTasks: 0,
      totalHoursLogged: 0,
      workloadPercent: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    await setDoc(doc(db, "members", newId), newMember);

    recordUndoAction({
      entityType: "member",
      entityId: newId,
      actionType: "create",
      description: `Crear miembro: "${newMember.nombre}"`,
      undoDescription: `Miembro "${newMember.nombre}" eliminado`,
      redoDescription: `Miembro "${newMember.nombre}" recreado`,
      executeUndo: async () => {
        await deleteDoc(doc(db, "members", newId));
      },
      executeRedo: async () => {
        await setDoc(doc(db, "members", newId), newMember);
      },
    });

    return newId;
  }, []);

  const updateMember = useCallback(async (id: string, data: Partial<Member>): Promise<void> => {
    const prevMember = members.find((m) => String(m.id) === String(id));
    const docRef = doc(db, "members", String(id));
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    if (prevMember) {
      const memberName = prevMember.nombre || "Miembro";
      const prevSnapshot: any = {};
      for (const key of Object.keys(data)) {
        if (key === "id") continue;
        prevSnapshot[key] = (prevMember as any)[key] !== undefined ? (prevMember as any)[key] : null;
      }

      recordUndoAction({
        entityType: "member",
        entityId: String(id),
        actionType: "update",
        description: `Modificar miembro: "${memberName}"`,
        undoDescription: `Miembro "${memberName}" restaurado`,
        redoDescription: `Miembro "${memberName}" modificado`,
        executeUndo: async () => {
          const ref = doc(db, "members", String(id));
          await updateDoc(ref, {
            ...prevSnapshot,
            updatedAt: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        },
        executeRedo: async () => {
          const ref = doc(db, "members", String(id));
          await updateDoc(ref, {
            ...data,
            updatedAt: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        },
      });
    }
  }, [members]);

  const deleteMember = useCallback(async (id: string): Promise<void> => {
    const prevMember = members.find((m) => String(m.id) === String(id));
    const docRef = doc(db, "members", String(id));
    await deleteDoc(docRef);

    if (prevMember) {
      const memberName = prevMember.nombre || "Miembro";
      recordUndoAction({
        entityType: "member",
        entityId: String(id),
        actionType: "delete",
        description: `Eliminar miembro: "${memberName}"`,
        undoDescription: `Miembro "${memberName}" restaurado`,
        redoDescription: `Miembro "${memberName}" eliminado`,
        executeUndo: async () => {
          await setDoc(doc(db, "members", String(id)), {
            ...prevMember,
            updatedAt: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        },
        executeRedo: async () => {
          await deleteDoc(doc(db, "members", String(id)));
        },
      });
    }
  }, [members]);

  return {
    members,
    isLoading,
    createMember,
    updateMember,
    deleteMember,
  };
}
