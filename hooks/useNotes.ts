"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/store";
import type { NoteDoc } from "@/lib/types";
import { getWorkspaceScopedCol, cleanFirestorePayload } from "@/lib/utils";

function getNotesColName(workspaceId?: string | null): string {
  if (!workspaceId) {
    return "notes";
  }
  const isMaster =
    workspaceId === "brandex-master" ||
    workspaceId === "ws_159789" ||
    workspaceId === "159789";
  return getWorkspaceScopedCol("notes", workspaceId, isMaster);
}

export function sortNotesByOrder(notes: NoteDoc[]): NoteDoc[] {
  return [...notes].sort((a, b) => {
    // 1. Pinned notes first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // 2. Custom manual order
    if (typeof a.order === "number" && typeof b.order === "number") {
      return a.order - b.order;
    }
    if (typeof a.order === "number") return -1;
    if (typeof b.order === "number") return 1;

    // 3. Fallback to updatedAt / createdAt descending
    const timeA = a.updatedAt?.toMillis
      ? a.updatedAt.toMillis()
      : a.updatedAt?.seconds
      ? a.updatedAt.seconds * 1000
      : new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = b.updatedAt?.toMillis
      ? b.updatedAt.toMillis()
      : b.updatedAt?.seconds
      ? b.updatedAt.seconds * 1000
      : new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

export function useNotes() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const colName = getNotesColName(workspaceId);

  // Escucha en tiempo real de Firestore para sincronización inmediata
  useEffect(() => {
    if (!colName) return;

    try {
      const notesRef = collection(db, colName);
      const q = query(notesRef);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const rawNotes: NoteDoc[] = snapshot.docs
            .map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                title: data.title || "Nota sin título",
                content: data.content || "",
                noteType: data.noteType || "texto",
                subtasks: data.subtasks || [],
                taskId: data.taskId || null,
                taskTitle: data.taskTitle || null,
                projectId: data.projectId || null,
                projectTitle: data.projectTitle || null,
                clientColor: data.clientColor || null,
                isPinned: !!data.isPinned,
                isCompleted: !!data.isCompleted,
                isDeleted: !!data.isDeleted,
                deletedAt: data.deletedAt || data.deleted_at,
                order: typeof data.order === "number" ? data.order : undefined,
                workspaceId: data.workspaceId || workspaceId || "",
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
              };
            })
            .filter((n) => !n.isDeleted);

          const sorted = sortNotesByOrder(rawNotes);
          queryClient.setQueryData(["notes", colName], sorted);
        },
        (error) => {
          console.warn("[useNotes] Error en listener onSnapshot de Firestore:", error);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn("[useNotes] Exception setting onSnapshot:", e);
    }
  }, [colName, queryClient, workspaceId]);

  return useQuery<NoteDoc[]>({
    queryKey: ["notes", colName],
    queryFn: async () => {
      // Retorna lo que esté en cache o vacío mientras conecta snapshot
      const cached = queryClient.getQueryData<NoteDoc[]>(["notes", colName]) || [];
      return sortNotesByOrder(cached);
    },
    staleTime: Infinity,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const colName = getNotesColName(workspaceId);

  return useMutation({
    mutationFn: async (newNote: Partial<NoteDoc>) => {
      const noteId = newNote.id || `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const docRef = doc(db, colName, String(noteId));

      const currentNotes = queryClient.getQueryData<NoteDoc[]>(["notes", colName]) || [];
      const minOrder = currentNotes.reduce(
        (min, n) => (typeof n.order === "number" && n.order < min ? n.order : min),
        0
      );
      const initialOrder =
        typeof newNote.order === "number"
          ? newNote.order
          : currentNotes.length > 0
          ? minOrder - 1
          : 0;

      const payload = cleanFirestorePayload({
        id: String(noteId),
        title: newNote.title?.trim() || "Nueva Nota",
        content: newNote.content || "",
        noteType: newNote.noteType || "texto",
        subtasks: newNote.subtasks || [],
        taskId: newNote.taskId ? String(newNote.taskId) : null,
        taskTitle: newNote.taskTitle || null,
        projectId: newNote.projectId ? String(newNote.projectId) : null,
        projectTitle: newNote.projectTitle || null,
        clientColor: newNote.clientColor || null,
        isPinned: !!newNote.isPinned,
        isCompleted: !!newNote.isCompleted,
        isDeleted: false,
        order: initialOrder,
        workspaceId: workspaceId || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(docRef, payload, { merge: true });
      return { ...payload };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", colName] });
    },
  });
}

export function useReorderNotes() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const colName = getNotesColName(workspaceId);

  return useMutation({
    mutationFn: async (reorderedNotes: NoteDoc[]) => {
      const batch = writeBatch(db);
      reorderedNotes.forEach((note, index) => {
        const docRef = doc(db, colName, String(note.id));
        batch.update(docRef, {
          order: index,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      return reorderedNotes;
    },
    onMutate: async (reorderedNotes: NoteDoc[]) => {
      await queryClient.cancelQueries({ queryKey: ["notes", colName] });
      const previousNotes = queryClient.getQueryData<NoteDoc[]>(["notes", colName]) || [];
      queryClient.setQueryData<NoteDoc[]>(["notes", colName], reorderedNotes);
      return { previousNotes };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["notes", colName], context.previousNotes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", colName] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const colName = getNotesColName(workspaceId);

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NoteDoc> & { id: string }) => {
      const docRef = doc(db, colName, String(id));
      const payload = cleanFirestorePayload({
        ...updates,
        updatedAt: serverTimestamp(),
      });

      await updateDoc(docRef, payload);
      return { id, ...updates };
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ["notes", colName] });
      const previousNotes = queryClient.getQueryData<NoteDoc[]>(["notes", colName]) || [];

      queryClient.setQueryData<NoteDoc[]>(["notes", colName], (old) =>
        (old || []).map((n) => (n.id === id ? { ...n, ...updates } : n))
      );

      return { previousNotes };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["notes", colName], context.previousNotes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", colName] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const colName = getNotesColName(workspaceId);

  return useMutation({
    mutationFn: async (noteId: string) => {
      const docRef = doc(db, colName, String(noteId));
      await updateDoc(docRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return noteId;
    },
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ["notes", colName] });
      const previousNotes = queryClient.getQueryData<NoteDoc[]>(["notes", colName]) || [];

      queryClient.setQueryData<NoteDoc[]>(["notes", colName], (old) =>
        (old || []).filter((n) => n.id !== noteId)
      );

      return { previousNotes };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["notes", colName], context.previousNotes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", colName] });
    },
  });
}

export function useTrashNotes() {
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const colName = getNotesColName(workspaceId);
  const [trashNotes, setTrashNotes] = useState<(NoteDoc & { daysRemaining: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!colName) return;
    setIsLoading(true);

    const notesRef = collection(db, colName);
    const q = query(notesRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const nowMs = Date.now();
        const deletedDocs: NoteDoc[] = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title || "Nota sin título",
              content: data.content || "",
              noteType: data.noteType || "texto",
              subtasks: data.subtasks || [],
              taskId: data.taskId || null,
              taskTitle: data.taskTitle || null,
              projectId: data.projectId || null,
              projectTitle: data.projectTitle || null,
              clientColor: data.clientColor || null,
              isPinned: !!data.isPinned,
              isCompleted: !!data.isCompleted,
              isDeleted: !!data.isDeleted,
              deletedAt: data.deletedAt || data.deleted_at || data.updatedAt,
              order: typeof data.order === "number" ? data.order : undefined,
              workspaceId: data.workspaceId || workspaceId || "",
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
          })
          .filter((n) => !!n.isDeleted);

        const trashWithDays = deletedDocs.map((n) => {
          const deletedMs = n.deletedAt?.toMillis
            ? n.deletedAt.toMillis()
            : n.deletedAt?.seconds
            ? n.deletedAt.seconds * 1000
            : new Date(n.deletedAt || n.updatedAt || 0).getTime();
          const daysPassed = Math.max(0, Math.floor((nowMs - deletedMs) / (1000 * 60 * 60 * 24)));
          const daysRemaining = Math.max(0, 30 - daysPassed);
          return {
            ...n,
            daysRemaining,
          };
        });

        trashWithDays.sort((a, b) => {
          const aMs = a.deletedAt?.toMillis ? a.deletedAt.toMillis() : new Date(a.deletedAt || 0).getTime();
          const bMs = b.deletedAt?.toMillis ? b.deletedAt.toMillis() : new Date(b.deletedAt || 0).getTime();
          return bMs - aMs;
        });

        setTrashNotes(trashWithDays);
        setIsLoading(false);
      },
      (err) => {
        console.warn("[useTrashNotes] Error en listener onSnapshot:", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [colName, workspaceId]);

  const restoreNotes = async (noteIds: string[]) => {
    for (const id of noteIds) {
      const docRef = doc(db, colName, id);
      await updateDoc(docRef, {
        isDeleted: false,
        deletedAt: null,
        deleted_at: null,
        updatedAt: serverTimestamp(),
      });
    }
  };

  const permanentDeleteNotes = async (noteIds: string[]) => {
    for (const id of noteIds) {
      const docRef = doc(db, colName, id);
      await deleteDoc(docRef);
    }
  };

  const emptyTrash = async () => {
    for (const n of trashNotes) {
      const docRef = doc(db, colName, n.id);
      await deleteDoc(docRef);
    }
  };

  return {
    trashNotes,
    trashCount: trashNotes.length,
    isLoading,
    restoreNotes,
    permanentDeleteNotes,
    emptyTrash,
  };
}
