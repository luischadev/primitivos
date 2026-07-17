// =============================================================================
// src/storage/projectStorage.ts
// Persist palette system projects in localStorage.
// =============================================================================

import type { PaletteSystemConfig } from "../engines/types";
import { createDefaultSystem } from "../engines/types";

const STORAGE_KEY = "color-builder-projects";
const STORAGE_VERSION = 1;

export type StoredProject = {
  id: string;
  name: string;
  updatedAt: number;
  config: PaletteSystemConfig;
};

type ProjectStore = {
  version: number;
  activeProjectId: string;
  projects: StoredProject[];
};

function createProject(name: string, config?: PaletteSystemConfig): StoredProject {
  return {
    id: crypto.randomUUID(),
    name,
    updatedAt: Date.now(),
    config: config ?? createDefaultSystem(),
  };
}

function createDefaultStore(): ProjectStore {
  const project = createProject("Proyecto 1");
  return {
    version: STORAGE_VERSION,
    activeProjectId: project.id,
    projects: [project],
  };
}

function isPaletteSystemConfig(value: unknown): value is PaletteSystemConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as PaletteSystemConfig;
  return Array.isArray(v.palettes) && !!v.globalScale;
}

function isStoredProject(value: unknown): value is StoredProject {
  if (!value || typeof value !== "object") return false;
  const v = value as StoredProject;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.updatedAt === "number" &&
    isPaletteSystemConfig(v.config)
  );
}

function parseStore(raw: string | null): ProjectStore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ProjectStore>;
    if (
      parsed.version !== STORAGE_VERSION ||
      typeof parsed.activeProjectId !== "string" ||
      !Array.isArray(parsed.projects) ||
      parsed.projects.length === 0 ||
      !parsed.projects.every(isStoredProject)
    ) {
      return null;
    }
    const activeExists = parsed.projects.some((p) => p.id === parsed.activeProjectId);
    if (!activeExists) {
      parsed.activeProjectId = parsed.projects[0].id;
    }
    return parsed as ProjectStore;
  } catch {
    return null;
  }
}

export function loadProjectStore(): ProjectStore {
  if (typeof window === "undefined") return createDefaultStore();
  return parseStore(localStorage.getItem(STORAGE_KEY)) ?? createDefaultStore();
}

export function saveProjectStore(store: ProjectStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getActiveProject(store: ProjectStore): StoredProject {
  return store.projects.find((p) => p.id === store.activeProjectId) ?? store.projects[0];
}

export function updateActiveProjectConfig(
  store: ProjectStore,
  config: PaletteSystemConfig,
): ProjectStore {
  const now = Date.now();
  const projects = store.projects.map((p) =>
    p.id === store.activeProjectId ? { ...p, config, updatedAt: now } : p,
  );
  return { ...store, projects };
}

export function switchActiveProject(store: ProjectStore, projectId: string): ProjectStore | null {
  if (!store.projects.some((p) => p.id === projectId)) return null;
  return { ...store, activeProjectId: projectId };
}

export function addProject(store: ProjectStore, name: string): ProjectStore {
  const project = createProject(name);
  return {
    ...store,
    activeProjectId: project.id,
    projects: [...store.projects, project],
  };
}

export function duplicateProject(
  store: ProjectStore,
  projectId: string,
  config?: PaletteSystemConfig,
): ProjectStore | null {
  const saved = config ? updateActiveProjectConfig(store, config) : store;
  const source = saved.projects.find((p) => p.id === projectId);
  if (!source) return null;

  const sourceConfig =
    projectId === saved.activeProjectId && config ? config : source.config;

  const name = uniqueProjectName(
    `${source.name} (copia)`,
    saved.projects.map((p) => p.name),
  );
  const copy = createProject(name, JSON.parse(JSON.stringify(sourceConfig)) as PaletteSystemConfig);

  const insertIdx = saved.projects.findIndex((p) => p.id === projectId);
  const projects = [...saved.projects];
  projects.splice(insertIdx + 1, 0, copy);

  return {
    ...saved,
    activeProjectId: copy.id,
    projects,
  };
}

export function renameProject(
  store: ProjectStore,
  projectId: string,
  name: string,
): ProjectStore {
  const trimmed = name.trim() || "Sin nombre";
  return {
    ...store,
    projects: store.projects.map((p) =>
      p.id === projectId ? { ...p, name: trimmed, updatedAt: Date.now() } : p,
    ),
  };
}

export function deleteProject(store: ProjectStore, projectId: string): ProjectStore | null {
  if (store.projects.length <= 1) return null;
  const projects = store.projects.filter((p) => p.id !== projectId);
  const activeProjectId =
    store.activeProjectId === projectId ? projects[0].id : store.activeProjectId;
  return { ...store, activeProjectId, projects };
}

export function uniqueProjectName(base: string, existing: string[]): string {
  const trimmed = base.trim() || "Proyecto";
  if (!existing.includes(trimmed)) return trimmed;
  let i = 2;
  while (existing.includes(`${trimmed} ${i}`)) i += 1;
  return `${trimmed} ${i}`;
}
