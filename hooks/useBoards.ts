"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/store";
import { getWorkspaceScopedCol } from "@/lib/utils";
import type { Board, BoardElement, BoardViewport } from "@/lib/types/board";

export const INITIAL_BOARDS: Board[] = [
  {
    id: "board-demo-1",
    title: "Moodboard & Campaña Visual",
    workspaceId: "brandex-master",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    elements: [
      {
        id: "frame-1",
        type: "frame",
        title: "Frame 1",
        x: 120,
        y: 80,
        width: 480,
        height: 320,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderColor: "rgba(255, 255, 255, 0.12)",
      },
      {
        id: "sticky-1",
        type: "sticky",
        text: "Explorar paletas oscuras con acentos monocromáticos y tipografía nítida.",
        color: "#FCD34D", // Pastel Yellow
        x: 150,
        y: 130,
        width: 220,
        height: 180,
        frameId: "frame-1",
      },
      {
        id: "frame-2",
        type: "frame",
        title: "Frame 2",
        x: 660,
        y: 80,
        width: 440,
        height: 320,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderColor: "rgba(255, 255, 255, 0.12)",
      },
      {
        id: "text-1",
        type: "text",
        text: "Brainstorming de Entregables",
        fontSize: "lg",
        color: "#ffffff",
        x: 120,
        y: 30,
      },
      {
        id: "stroke-1",
        type: "stroke",
        points: [
          { x: 380, y: 220 },
          { x: 440, y: 240 },
          { x: 520, y: 210 },
          { x: 620, y: 230 },
          { x: 660, y: 220 },
        ],
        color: "#3B82F6",
        strokeWidth: 4,
        x: 380,
        y: 210,
        width: 280,
        height: 30,
      },
    ],
    viewport: { x: 40, y: 40, zoom: 1 },
    previewColor: "#3B82F6",
  },
];

export function useBoards() {
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const isMaster = workspaceId === "brandex-master" || workspaceId === "ws_159789" || workspaceId === "159789";

  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  // Ref para debounced element saves
  const debounceTimerRef = useRef<{ [boardId: string]: NodeJS.Timeout }>({});

  const colName = useMemo(() => {
    return getWorkspaceScopedCol("boards", workspaceId, isMaster);
  }, [workspaceId, isMaster]);

  // Listener en tiempo real con Firestore onSnapshot
  useEffect(() => {
    if (!workspaceId) {
      setBoards([]);
      setIsLoading(false);
      return;
    }

    const colRef = collection(db, colName);

    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          if (isMaster) {
            // Seed inicial si está vacío
            try {
              for (const initialBoard of INITIAL_BOARDS) {
                await setDoc(doc(db, colName, initialBoard.id), {
                  ...initialBoard,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              }
            } catch (err) {
              console.error("Error seeding initial boards:", err);
            }
          }
          setBoards(isMaster ? INITIAL_BOARDS : []);
          setIsLoading(false);
          return;
        }

        const loadedBoards: Board[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title || "Sin título",
            workspaceId: data.workspaceId || workspaceId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            elements: Array.isArray(data.elements) ? data.elements : [],
            viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
            previewColor: data.previewColor || "#3b82f6",
          };
        });

        // Ordenar por updatedAt descendente
        loadedBoards.sort((a, b) => {
          const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt || 0).getTime();
          const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt || 0).getTime();
          return tB - tA;
        });

        setBoards(loadedBoards);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error listening to boards:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [colName, workspaceId, isMaster]);

  const activeBoard = useMemo(() => {
    if (!activeBoardId) return null;
    return boards.find((b) => b.id === activeBoardId) || null;
  }, [boards, activeBoardId]);

  // Crear nuevo tablero
  const createBoard = useCallback(
    async (title = "Sin título", initialElements: BoardElement[] = []) => {
      const newId = `board-${Date.now()}`;
      const newBoard: Board = {
        id: newId,
        title,
        workspaceId: workspaceId || "brandex-master",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: initialElements,
        viewport: { x: 0, y: 0, zoom: 1 },
        previewColor: "#3b82f6",
      };

      // Actualización optimista local
      setBoards((prev) => [newBoard, ...prev]);
      setActiveBoardId(newId);

      try {
        await setDoc(doc(db, colName, newId), {
          ...newBoard,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Error creating board in Firestore:", err);
      }

      return newId;
    },
    [colName, workspaceId]
  );

  // Actualizar datos del tablero (título, viewport, etc.)
  const updateBoard = useCallback(
    async (boardId: string, updates: Partial<Board>) => {
      setSaveStatus("saving");

      // Optimistic update
      setBoards((prev) =>
        prev.map((b) => (b.id === boardId ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b))
      );

      try {
        await updateDoc(doc(db, colName, boardId), {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        setSaveStatus("saved");
      } catch (err) {
        console.error("Error updating board:", err);
        setSaveStatus("error");
      }
    },
    [colName]
  );

  // Actualizar elementos con debounced auto-save
  const updateBoardElements = useCallback(
    (boardId: string, newElements: BoardElement[]) => {
      // Optimistic instant state update in memory
      setBoards((prev) =>
        prev.map((b) => (b.id === boardId ? { ...b, elements: newElements, updatedAt: new Date().toISOString() } : b))
      );
      setSaveStatus("saving");

      if (debounceTimerRef.current[boardId]) {
        clearTimeout(debounceTimerRef.current[boardId]);
      }

      debounceTimerRef.current[boardId] = setTimeout(async () => {
        try {
          await updateDoc(doc(db, colName, boardId), {
            elements: newElements,
            updatedAt: serverTimestamp(),
          });
          setSaveStatus("saved");
        } catch (err) {
          console.error("Error saving board elements to Firestore:", err);
          setSaveStatus("error");
        }
      }, 400);
    },
    [colName]
  );

  // Eliminar tablero
  const deleteBoard = useCallback(
    async (boardId: string) => {
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
      if (activeBoardId === boardId) {
        setActiveBoardId(null);
      }

      try {
        await deleteDoc(doc(db, colName, boardId));
      } catch (err) {
        console.error("Error deleting board:", err);
      }
    },
    [colName, activeBoardId]
  );

  return {
    boards,
    isLoading,
    activeBoardId,
    activeBoard,
    setActiveBoardId,
    createBoard,
    updateBoard,
    updateBoardElements,
    deleteBoard,
    saveStatus,
  };
}
