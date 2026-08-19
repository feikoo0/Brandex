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
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordUndoAction } from "@/lib/undoManager";
import type { Client } from "@/lib/types";

export const INITIAL_CLIENTS: Client[] = [
  {
    id: "1",
    nombre: "Apple Inc.",
    name: "Apple Inc.",
    logo: "",
    industria: "Tecnología & Hardware",
    industry: "Tecnología & Hardware",
    plan_contratado: "alianza",
    estado_relacion: "activo",
    status: "VIP",
    statusColor: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    color: "hsl(271, 91%, 65%)",
    colorName: "Púrpura",
    fecha_inicio: "2024-01-15",
    sinceDate: "Ene 2024",
    contacto: {
      persona: "Sarah Jenkins / VP Design",
      email: "s.jenkins@apple.com",
      telefono: "+1 (408) 996-1010",
      whatsapp: "+14089961010",
    },
    contactPerson: "Sarah Jenkins / VP Design",
    email: "s.jenkins@apple.com",
    tel: "+1 (408) 996-1010",
    drive_links: [
      { id: "cdl-1", label: "Master Brand Guidelines", url: "https://drive.google.com" },
      { id: "cdl-2", label: "3D Spatial Assets", url: "https://drive.google.com" },
      { id: "cdl-3", label: "Contrato de Servicios 2024", url: "https://drive.google.com" }
    ],
    notas_internas: "Cuenta clave corporativa. Prioridad máxima en revisiones de interfaces tridimensionales.",
    notes: "Cuenta clave corporativa. Prioridad máxima en revisiones de interfaces tridimensionales.",
    finanzas: {
      monto_contrato: 45000,
      total_pagado: 32000,
      proxima_factura: "2026-09-01",
      historial_pagos: [
        { id: "p-1", fecha: "2026-07-01", monto: 16000, estado: "pagado" },
        { id: "p-2", fecha: "2026-08-01", monto: 16000, estado: "pagado" },
        { id: "p-3", fecha: "2026-09-01", monto: 13000, estado: "pendiente" }
      ]
    },
    totalBudget: "$45,000",
    paidAmount: "$32,000",
    pendingBalance: "$13,000",
    website: "apple.com"
  },
  {
    id: "2",
    nombre: "Nike",
    name: "Nike",
    logo: "N",
    industria: "Moda & Deporte",
    industry: "Moda & Deporte",
    plan_contratado: "crecimiento",
    estado_relacion: "activo",
    status: "Activo",
    statusColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    color: "hsl(217, 91%, 60%)",
    colorName: "Azul Eléctrico",
    fecha_inicio: "2024-03-01",
    sinceDate: "Mar 2024",
    contacto: {
      persona: "Marcus Vance / Brand Dir.",
      email: "m.vance@nike.com",
      telefono: "+1 (503) 671-6453",
      whatsapp: "+15036716453",
    },
    contactPerson: "Marcus Vance / Brand Dir.",
    email: "m.vance@nike.com",
    tel: "+1 (503) 671-6453",
    drive_links: [
      { id: "cdl-4", label: "Spring 2026 Campaign Lookbook", url: "https://drive.google.com" },
      { id: "cdl-5", label: "Video Renders Finals", url: "https://drive.google.com" }
    ],
    notas_internas: "Sprint semanal de motion graphics. Entregas los jueves.",
    notes: "Sprint semanal de motion graphics. Entregas los jueves.",
    finanzas: {
      monto_contrato: 38000,
      total_pagado: 25000,
      proxima_factura: "2026-09-15",
      historial_pagos: [
        { id: "p-4", fecha: "2026-06-15", monto: 12500, estado: "pagado" },
        { id: "p-5", fecha: "2026-07-15", monto: 12500, estado: "pagado" },
        { id: "p-6", fecha: "2026-09-15", monto: 13000, estado: "pendiente" }
      ]
    },
    totalBudget: "$38,000",
    paidAmount: "$25,000",
    pendingBalance: "$13,000",
    website: "nike.com"
  },
  {
    id: "3",
    nombre: "Tesla Motors",
    name: "Tesla Motors",
    logo: "T",
    industria: "Automotriz & Energía",
    industry: "Automotriz & Energía",
    plan_contratado: "alianza",
    estado_relacion: "activo",
    status: "VIP",
    statusColor: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    color: "hsl(0, 84%, 60%)",
    colorName: "Rojo Coral",
    fecha_inicio: "2024-05-10",
    sinceDate: "May 2024",
    contacto: {
      persona: "Elena Rostova / UI Lead",
      email: "e.rostova@tesla.com",
      telefono: "+1 (650) 681-5000",
      whatsapp: "+16506815000",
    },
    contactPerson: "Elena Rostova / UI Lead",
    email: "e.rostova@tesla.com",
    tel: "+1 (650) 681-5000",
    drive_links: [
      { id: "cdl-6", label: "Dashboard HMI Telemetry specs", url: "https://drive.google.com" }
    ],
    notas_internas: "Enfocados en la interfaz de pantalla para vehículos de próxima generación.",
    notes: "Enfocados en la interfaz de pantalla para vehículos de próxima generación.",
    finanzas: {
      monto_contrato: 52000,
      total_pagado: 40000,
      proxima_factura: "2026-10-01",
      historial_pagos: [
        { id: "p-7", fecha: "2026-05-01", monto: 20000, estado: "pagado" },
        { id: "p-8", fecha: "2026-07-01", monto: 20000, estado: "pagado" },
        { id: "p-9", fecha: "2026-10-01", monto: 12000, estado: "pendiente" }
      ]
    },
    totalBudget: "$52,000",
    paidAmount: "$40,000",
    pendingBalance: "$12,000",
    website: "tesla.com"
  },
  {
    id: "4",
    nombre: "Airbnb",
    name: "Airbnb",
    logo: "A",
    industria: "Turismo & Hospitality",
    industry: "Turismo & Hospitality",
    plan_contratado: "crecimiento",
    estado_relacion: "activo",
    status: "Activo",
    statusColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    color: "hsl(25, 95%, 53%)",
    colorName: "Naranja Ámbar",
    fecha_inicio: "2024-02-20",
    sinceDate: "Feb 2024",
    contacto: {
      persona: "Julian Hayes / Global Ops",
      email: "j.hayes@airbnb.com",
      telefono: "+1 (415) 500-0001",
      whatsapp: "+14155000001",
    },
    contactPerson: "Julian Hayes / Global Ops",
    email: "j.hayes@airbnb.com",
    tel: "+1 (415) 500-0001",
    drive_links: [],
    notas_internas: "Producción de páginas de aterrizaje y assets promocionales globales.",
    notes: "Producción de páginas de aterrizaje y assets promocionales globales.",
    finanzas: {
      monto_contrato: 30000,
      total_pagado: 20000,
      proxima_factura: "2026-09-20",
      historial_pagos: [
        { id: "p-10", fecha: "2026-06-20", monto: 10000, estado: "pagado" },
        { id: "p-11", fecha: "2026-07-20", monto: 10000, estado: "pagado" },
        { id: "p-12", fecha: "2026-09-20", monto: 10000, estado: "pendiente" }
      ]
    },
    totalBudget: "$30,000",
    paidAmount: "$20,000",
    pendingBalance: "$10,000",
    website: "airbnb.com"
  },
  {
    id: "5",
    nombre: "Red Bull",
    name: "Red Bull",
    logo: "RB",
    industria: "Bebidas & Eventos",
    industry: "Bebidas & Eventos",
    plan_contratado: "crecimiento",
    estado_relacion: "pausa",
    status: "Pausa",
    statusColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    color: "hsl(142, 71%, 45%)",
    colorName: "Verde Esmeralda",
    fecha_inicio: "2024-04-01",
    sinceDate: "Abr 2024",
    contacto: {
      persona: "Hans Gruber / Media Lead",
      email: "h.gruber@redbull.com",
      telefono: "+43 662 65820",
      whatsapp: "+4366265820",
    },
    contactPerson: "Hans Gruber / Media Lead",
    email: "h.gruber@redbull.com",
    tel: "+43 662 65820",
    drive_links: [],
    notas_internas: "Pausado temporalmente mientras definen la campaña de invierno 2026.",
    notes: "Pausado temporalmente mientras definen la campaña de invierno 2026.",
    finanzas: {
      monto_contrato: 22000,
      total_pagado: 15000,
      proxima_factura: "2026-11-01",
      historial_pagos: [
        { id: "p-13", fecha: "2026-04-01", monto: 15000, estado: "pagado" },
        { id: "p-14", fecha: "2026-11-01", monto: 7000, estado: "pendiente" }
      ]
    },
    totalBudget: "$22,000",
    paidAmount: "$15,000",
    pendingBalance: "$7,000",
    website: "redbull.com"
  },
  {
    id: "6",
    nombre: "Spotify",
    name: "Spotify",
    logo: "S",
    industria: "Audio & Streaming",
    industry: "Audio & Streaming",
    plan_contratado: "alianza",
    estado_relacion: "activo",
    status: "VIP",
    statusColor: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    color: "hsl(141, 76%, 48%)",
    colorName: "Verde Menta",
    fecha_inicio: "2024-06-01",
    sinceDate: "Jun 2024",
    contacto: {
      persona: "Astrid Lind / Design Director",
      email: "astrid@spotify.com",
      telefono: "+46 8 500 0000",
      whatsapp: "+4685000000",
    },
    contactPerson: "Astrid Lind / Design Director",
    email: "astrid@spotify.com",
    tel: "+46 8 500 0000",
    drive_links: [],
    notas_internas: "Desarrollo de animaciones interactivas para campañas de fin de año.",
    notes: "Desarrollo de animaciones interactivas para campañas de fin de año.",
    finanzas: {
      monto_contrato: 40000,
      total_pagado: 28000,
      proxima_factura: "2026-09-10",
      historial_pagos: [
        { id: "p-15", fecha: "2026-06-01", monto: 14000, estado: "pagado" },
        { id: "p-16", fecha: "2026-07-01", monto: 14000, estado: "pagado" },
        { id: "p-17", fecha: "2026-09-10", monto: 12000, estado: "pendiente" }
      ]
    },
    totalBudget: "$40,000",
    paidAmount: "$28,000",
    pendingBalance: "$12,000",
    website: "spotify.com"
  }
];

// Alias for legacy support
export const INITIAL_V3_CLIENTS = INITIAL_CLIENTS;

export function useClients() {
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Real-time listener for Firestore collection "clients" (with fallback migration from "v3_clients")
  useEffect(() => {
    const colRef = collection(db, "clients");

    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            // Check if legacy "v3_clients" has documents to migrate
            const legacySnap = await getDocs(collection(db, "v3_clients"));
            if (!legacySnap.empty) {
              const migrationPromises = legacySnap.docs.map((d) =>
                setDoc(doc(db, "clients", d.id), {
                  ...d.data(),
                  createdAt: d.data().createdAt || d.data().created_at || serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  created_at: d.data().created_at || d.data().createdAt || serverTimestamp(),
                  updated_at: serverTimestamp(),
                })
              );
              await Promise.all(migrationPromises);
            } else {
              const seedPromises = INITIAL_CLIENTS.map((c) =>
                setDoc(doc(db, "clients", String(c.id)), {
                  ...c,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  created_at: serverTimestamp(),
                  updated_at: serverTimestamp(),
                })
              );
              await Promise.all(seedPromises);
            }
            setClients(INITIAL_CLIENTS);
          } catch (seedErr) {
            console.error("Error seeding initial clients:", seedErr);
            setClients(INITIAL_CLIENTS);
          }
        } else {
          const list: Client[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as Client;
            const monto = data.finanzas?.monto_contrato ?? Number(data.totalBudget?.replace(/[^0-9.-]+/g, "")) ?? 0;
            const pagado = data.finanzas?.total_pagado ?? Number(data.paidAmount?.replace(/[^0-9.-]+/g, "")) ?? 0;
            const pend = monto - pagado;

            list.push({
              ...data,
              id: d.id,
              nombre: data.nombre || data.name || "Cliente sin nombre",
              name: data.nombre || data.name || "Cliente sin nombre",
              plan_contratado: data.plan_contratado || "crecimiento",
              estado_relacion: data.estado_relacion || "activo",
              status: data.status || "Activo",
              color: data.color || "",
              colorName: data.colorName || "",
              customColor: data.customColor,
              drive_links: data.drive_links || [],
              notas_internas: data.notas_internas || data.notes || "",
              notes: data.notas_internas || data.notes || "",
              finanzas: data.finanzas || {
                monto_contrato: monto,
                total_pagado: pagado,
                proxima_factura: "2026-09-01",
                historial_pagos: [
                  { id: "p-init", fecha: "2026-08-01", monto: pagado, estado: "pagado" },
                  ...(pend > 0 ? [{ id: "p-pend", fecha: "2026-09-01", monto: pend, estado: "pendiente" as const }] : [])
                ]
              },
              totalBudget: `$${monto.toLocaleString()}`,
              paidAmount: `$${pagado.toLocaleString()}`,
              pendingBalance: `$${pend.toLocaleString()}`,
              createdAt: data.createdAt || data.created_at || null,
              updatedAt: data.updatedAt || data.updated_at || null,
              created_at: data.created_at || data.createdAt || null,
              updated_at: data.updated_at || data.updatedAt || null,
            });
          });
          setClients(list);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error subscribing to clients:", err);
        setClients(INITIAL_CLIENTS);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Crear nuevo cliente
  const createClient = useCallback(async (data: Partial<Client>): Promise<string> => {
    const newId = "cli-" + Date.now();
    const monto = data.finanzas?.monto_contrato ?? Number(data.totalBudget?.replace(/[^0-9.-]+/g, "")) ?? 0;
    const pagado = data.finanzas?.total_pagado ?? Number(data.paidAmount?.replace(/[^0-9.-]+/g, "")) ?? 0;

    const newClient: Client = {
      id: newId,
      nombre: data.nombre || data.name || "Nuevo Cliente",
      name: data.nombre || data.name || "Nuevo Cliente",
      logo: data.logo || (data.nombre ? data.nombre.charAt(0).toUpperCase() : "C"),
      industria: data.industria || data.industry || "Servicios",
      industry: data.industria || data.industry || "Servicios",
      plan_contratado: data.plan_contratado || "crecimiento",
      estado_relacion: data.estado_relacion || "activo",
      status: data.status || "Activo",
      statusColor: data.statusColor || "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
      color: data.color || "hsl(217, 91%, 60%)",
      colorName: data.colorName || "Azul Eléctrico",
      customColor: data.customColor,
      fecha_inicio: data.fecha_inicio || new Date().toISOString().split("T")[0],
      sinceDate: data.sinceDate || "Reciente",
      contacto: data.contacto || {
        persona: data.contactPerson || "",
        email: data.email || "",
        telefono: data.tel || "",
        whatsapp: "",
      },
      contactPerson: data.contacto?.persona || data.contactPerson || "",
      email: data.contacto?.email || data.email || "",
      tel: data.contacto?.telefono || data.tel || "",
      drive_links: data.drive_links || [],
      notas_internas: data.notas_internas || data.notes || "",
      notes: data.notas_internas || data.notes || "",
      finanzas: data.finanzas || {
        monto_contrato: monto,
        total_pagado: pagado,
        proxima_factura: "",
        historial_pagos: [],
      },
      totalBudget: `$${monto.toLocaleString()}`,
      paidAmount: `$${pagado.toLocaleString()}`,
      pendingBalance: `$${(monto - pagado).toLocaleString()}`,
      website: data.website || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    await setDoc(doc(db, "clients", newId), newClient);

    recordUndoAction({
      entityType: "client",
      entityId: newId,
      actionType: "create",
      description: `Crear cliente: "${newClient.nombre}"`,
      undoDescription: `Cliente "${newClient.nombre}" eliminado`,
      redoDescription: `Cliente "${newClient.nombre}" recreado`,
      executeUndo: async () => {
        await deleteDoc(doc(db, "clients", newId));
      },
      executeRedo: async () => {
        await setDoc(doc(db, "clients", newId), newClient);
      },
    });

    return newId;
  }, []);

  // Actualizar cliente
  const updateClient = useCallback(async (id: string | number, data: Partial<Client>): Promise<void> => {
    const prevClient = clients.find((c) => String(c.id) === String(id));
    const docRef = doc(db, "clients", String(id));
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    if (prevClient) {
      const clientName = prevClient.nombre || "Cliente";
      const prevSnapshot: any = {};
      for (const key of Object.keys(data)) {
        if (key === "id") continue;
        prevSnapshot[key] = (prevClient as any)[key] !== undefined ? (prevClient as any)[key] : null;
      }

      recordUndoAction({
        entityType: "client",
        entityId: String(id),
        actionType: "update",
        description: `Modificar cliente: "${clientName}"`,
        undoDescription: `Cliente "${clientName}" restaurado`,
        redoDescription: `Cliente "${clientName}" modificado`,
        executeUndo: async () => {
          const ref = doc(db, "clients", String(id));
          await updateDoc(ref, {
            ...prevSnapshot,
            updatedAt: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        },
        executeRedo: async () => {
          const ref = doc(db, "clients", String(id));
          await updateDoc(ref, {
            ...data,
            updatedAt: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        },
      });
    }
  }, [clients]);

  // Eliminar cliente
  const deleteClient = useCallback(async (id: string | number): Promise<void> => {
    const prevClient = clients.find((c) => String(c.id) === String(id));
    const docRef = doc(db, "clients", String(id));
    await deleteDoc(docRef);

    if (prevClient) {
      const clientName = prevClient.nombre || "Cliente";
      recordUndoAction({
        entityType: "client",
        entityId: String(id),
        actionType: "delete",
        description: `Eliminar cliente: "${clientName}"`,
        undoDescription: `Cliente "${clientName}" restaurado`,
        redoDescription: `Cliente "${clientName}" eliminado`,
        executeUndo: async () => {
          await setDoc(doc(db, "clients", String(id)), {
            ...prevClient,
            updatedAt: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        },
        executeRedo: async () => {
          await deleteDoc(doc(db, "clients", String(id)));
        },
      });
    }
  }, [clients]);

  return {
    clients,
    isLoading,
    createClient,
    updateClient,
    deleteClient,
  };
}

// Alias for backwards compatibility
export const useClientsV3 = useClients;
