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
import type { Client, ClientPlan, ClientRelationshipStatus, DriveLink, PaymentHistoryItem } from "@/lib/types";

export const INITIAL_V3_CLIENTS: Client[] = [
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
    plan_contratado: "estrategico",
    estado_relacion: "activo",
    status: "Activo",
    statusColor: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    fecha_inicio: "2024-03-01",
    sinceDate: "Mar 2024",
    contacto: {
      persona: "Alex Mercer / Marketing Lead",
      email: "alex.mercer@nike.com",
      telefono: "+1 (503) 671-6453",
      whatsapp: "+15036716453",
    },
    contactPerson: "Alex Mercer / Marketing Lead",
    email: "alex.mercer@nike.com",
    tel: "+1 (503) 671-6453",
    drive_links: [
      { id: "cdl-4", label: "Lanzamientos 3D", url: "https://drive.google.com" },
      { id: "cdl-5", label: "Brief de Campaña", url: "https://drive.google.com" }
    ],
    notas_internas: "Campañas de lanzamientos de productos deportivos interactivos 3D.",
    notes: "Campañas de lanzamientos de productos deportivos interactivos 3D.",
    finanzas: {
      monto_contrato: 28000,
      total_pagado: 20000,
      proxima_factura: "2026-09-15",
      historial_pagos: [
        { id: "p-4", fecha: "2026-06-15", monto: 10000, estado: "pagado" },
        { id: "p-5", fecha: "2026-07-15", monto: 10000, estado: "pagado" },
        { id: "p-6", fecha: "2026-09-15", monto: 8000, estado: "pendiente" }
      ]
    },
    totalBudget: "$28,000",
    paidAmount: "$20,000",
    pendingBalance: "$8,000",
    website: "nike.com"
  },
  {
    id: "3",
    nombre: "Tesla",
    name: "Tesla",
    logo: "T",
    industria: "Automotriz & Energía",
    industry: "Automotriz & Energía",
    plan_contratado: "alianza",
    estado_relacion: "activo",
    status: "VIP",
    statusColor: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    fecha_inicio: "2023-11-20",
    sinceDate: "Nov 2023",
    contacto: {
      persona: "Claire Bennet / Product Owner",
      email: "cbennet@tesla.com",
      telefono: "+1 (650) 681-5000",
      whatsapp: "+16506815000",
    },
    contactPerson: "Claire Bennet / Product Owner",
    email: "cbennet@tesla.com",
    tel: "+1 (650) 681-5000",
    drive_links: [
      { id: "cdl-6", label: "Modelos CAD y Shaders", url: "https://drive.google.com" },
      { id: "cdl-7", label: "Documentación API", url: "https://drive.google.com" }
    ],
    notas_internas: "Plataforma e-commerce y visualizadores WebGL de vehículos en tiempo real.",
    notes: "Plataforma e-commerce y visualizadores WebGL de vehículos en tiempo real.",
    finanzas: {
      monto_contrato: 65000,
      total_pagado: 50000,
      proxima_factura: "2026-08-30",
      historial_pagos: [
        { id: "p-7", fecha: "2026-05-30", monto: 25000, estado: "pagado" },
        { id: "p-8", fecha: "2026-06-30", monto: 25000, estado: "pagado" },
        { id: "p-9", fecha: "2026-08-30", monto: 15000, estado: "pendiente" }
      ]
    },
    totalBudget: "$65,000",
    paidAmount: "$50,000",
    pendingBalance: "$15,000",
    website: "tesla.com"
  },
  {
    id: "4",
    nombre: "Airbnb",
    name: "Airbnb",
    logo: "A",
    industria: "Hospedaje & Viajes",
    industry: "Hospedaje & Viajes",
    plan_contratado: "crecimiento",
    estado_relacion: "activo",
    status: "Activo",
    statusColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    fecha_inicio: "2024-02-10",
    sinceDate: "Feb 2024",
    contacto: {
      persona: "David Lawson / Mobile Design Lead",
      email: "d.lawson@airbnb.com",
      telefono: "+1 (415) 800-5959",
      whatsapp: "+14158005959",
    },
    contactPerson: "David Lawson / Mobile Design Lead",
    email: "d.lawson@airbnb.com",
    tel: "+1 (415) 800-5959",
    drive_links: [
      { id: "cdl-8", label: "Figma App Mobile", url: "https://drive.google.com" }
    ],
    notas_internas: "Prototipado rápido de aplicación móvil MVP para experiencias locales.",
    notes: "Prototipado rápido de aplicación móvil MVP para experiencias locales.",
    finanzas: {
      monto_contrato: 18000,
      total_pagado: 12000,
      proxima_factura: "2026-09-10",
      historial_pagos: [
        { id: "p-10", fecha: "2026-07-10", monto: 6000, estado: "pagado" },
        { id: "p-11", fecha: "2026-08-10", monto: 6000, estado: "pagado" },
        { id: "p-12", fecha: "2026-09-10", monto: 6000, estado: "pendiente" }
      ]
    },
    totalBudget: "$18,000",
    paidAmount: "$12,000",
    pendingBalance: "$6,000",
    website: "airbnb.com"
  }
];

export function useClientsV3() {
  const [clients, setClients] = useState<Client[]>(INITIAL_V3_CLIENTS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Real-time listener for v3_clients
  useEffect(() => {
    const colRef = collection(db, "v3_clients");

    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            const seedPromises = INITIAL_V3_CLIENTS.map((c) =>
              setDoc(doc(db, "v3_clients", String(c.id)), c)
            );
            await Promise.all(seedPromises);
            setClients(INITIAL_V3_CLIENTS);
          } catch (seedErr) {
            console.error("Error seeding initial v3_clients:", seedErr);
            setClients(INITIAL_V3_CLIENTS);
          }
        } else {
          const list: Client[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as Client;
            // Normalize non-destructive fallback properties
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
            });
          });
          setClients(list);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error subscribing to v3_clients:", err);
        setClients(INITIAL_V3_CLIENTS);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const createClient = useCallback(async (data: Partial<Client>): Promise<string> => {
    const newId = "cli-" + Date.now();
    const monto = data.finanzas?.monto_contrato || 20000;
    const pagado = data.finanzas?.total_pagado || 0;
    const pend = monto - pagado;

    const newClient: Client = {
      id: newId,
      nombre: data.nombre || data.name || "Nuevo Cliente",
      name: data.nombre || data.name || "Nuevo Cliente",
      logo: data.logo || data.nombre?.slice(0, 1).toUpperCase() || "C",
      industria: data.industria || data.industry || "Servicios",
      industry: data.industria || data.industry || "Servicios",
      plan_contratado: data.plan_contratado || "crecimiento",
      estado_relacion: data.estado_relacion || "activo",
      status: data.status || "Activo",
      fecha_inicio: data.fecha_inicio || new Date().toISOString().split("T")[0],
      contacto: data.contacto || {
        persona: data.contactPerson || "",
        email: data.email || "",
        telefono: data.tel || data.telefono || "",
        whatsapp: data.whatsapp || "",
      },
      drive_links: data.drive_links || [],
      notas_internas: data.notas_internas || data.notes || "",
      notes: data.notas_internas || data.notes || "",
      finanzas: data.finanzas || {
        monto_contrato: monto,
        total_pagado: pagado,
        proxima_factura: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        historial_pagos: [
          { id: "p-1", fecha: new Date().toISOString().split("T")[0], monto: pagado, estado: "pagado" }
        ]
      },
      totalBudget: `$${monto.toLocaleString()}`,
      paidAmount: `$${pagado.toLocaleString()}`,
      pendingBalance: `$${pend.toLocaleString()}`,
      website: data.website || "",
    };

    await setDoc(doc(db, "v3_clients", newId), newClient);
    return newId;
  }, []);

  const updateClient = useCallback(async (id: string, data: Partial<Client>): Promise<void> => {
    const docRef = doc(db, "v3_clients", String(id));
    await updateDoc(docRef, {
      ...data,
      updated_at: serverTimestamp(),
    });
  }, []);

  const deleteClient = useCallback(async (id: string): Promise<void> => {
    const docRef = doc(db, "v3_clients", String(id));
    await deleteDoc(docRef);
  }, []);

  return {
    clients,
    isLoading,
    createClient,
    updateClient,
    deleteClient,
  };
}
