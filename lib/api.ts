// ─────────────────────────────────────────────────────────────────────────────
//  Braindex OS — API Client
//
//  All calls go to /api/* which Next.js proxies to your Python server.py.
//  When you migrate an endpoint to Next.js API Routes, just create
//  app/api/<path>/route.ts — Next.js will use that file first,
//  the rewrite acts as a fallback.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  SyncResponse,
  ApiResponse,
  LoginResponse,
  Task,
  Project,
  Client,
  Worker,
} from "./types";

// ── Low-level fetch wrapper ────────────────────────────────────────────────────
async function apiFetch<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
  }

  const json = (await res.json()) as T;
  
  // Logic errors from the server (e.g., Notion API errors)
  if (json && typeof json === 'object') {
    const obj = json as Record<string, any>;
    if (obj.ok === false || obj.error) {
      throw new Error(obj.error || "Error desconocido del servidor");
    }
  }

  return json;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(
  usuario: string,
  password: string
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("POST", "/api/login", { usuario, password });
}

export async function loginWithToken(
  token: string
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("POST", "/api/auth/token", { token });
}

// ── Sync (full data load) ─────────────────────────────────────────────────────
export async function syncAll(): Promise<SyncResponse> {
  return apiFetch<SyncResponse>("GET", "/api/sync");
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export async function createTask(
  data: Partial<Task> & { titulo: string }
): Promise<ApiResponse> {
  return apiFetch<ApiResponse>("POST", "/api/task/create", data);
}

export async function updateTask(
  data: Partial<Task> & { id: string }
): Promise<ApiResponse> {
  return apiFetch<ApiResponse>("PATCH", "/api/task/update", data);
}

// ── Projects ──────────────────────────────────────────────────────────────────
export async function createProject(
  data: Partial<Project> & { nombre: string }
): Promise<ApiResponse> {
  return apiFetch<ApiResponse>("POST", "/api/project/create", data);
}

export async function updateProject(
  data: Partial<Project> & { id: string }
): Promise<ApiResponse> {
  return apiFetch<ApiResponse>("PATCH", "/api/project/update", data);
}

// ── Clients ───────────────────────────────────────────────────────────────────
export async function createClient(
  data: Partial<Client> & { nombre: string }
): Promise<ApiResponse> {
  return apiFetch<ApiResponse>("POST", "/api/client/create", data);
}

export async function updateClient(
  data: Partial<Client> & { id: string }
): Promise<ApiResponse> {
  return apiFetch<ApiResponse>("PATCH", "/api/client/update", data);
}

// ── Workers ───────────────────────────────────────────────────────────────────
export async function updateWorker(
  data: Partial<Worker> & { id: string }
): Promise<ApiResponse> {
  return apiFetch<ApiResponse>("PATCH", "/api/worker/update", data);
}
