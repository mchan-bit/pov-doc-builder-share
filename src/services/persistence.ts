import type { ContentItem, POVInfo, CustomPort, SuccessCriteria, PovSource, PovDestination, PovUseCases } from '../types';
import defaultLibraryJson from '../data/defaultLibrary.json';
import { kvGet, kvSet } from './kvStore';

export const LIBRARY_KV_KEY = 'pov/content-library';
export const SESSION_KV_KEY = 'pov/session';

const LEGACY_LIBRARY_KEY = 'cribl_library_v6';
const LEGACY_SESSION_KEY = 'cribl_session_v6';

export const DEFAULT_CONTENT_LIBRARY = defaultLibraryJson as Record<string, ContentItem>;

export interface SessionData {
  checkedItems?: string[];
  povInfo?: Partial<POVInfo>;
  sessionCustomPorts?: CustomPort[];
  sessionSuccessCriteria?: SuccessCriteria[];
  sessionPovSources?: PovSource[];
  sessionPovDestinations?: PovDestination[];
  sessionPovUseCases?: PovUseCases;
  architectureChecked?: boolean;
  architectureImage?: string | null;
}

let libraryLoadPromise: Promise<Record<string, ContentItem>> | null = null;

function readLegacyLocalStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'value' in (parsed as Record<string, unknown>)) {
      return (parsed as Record<string, unknown>).value as T;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

export function isContentLibrary(value: unknown): value is Record<string, ContentItem> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return false;
  return entries.every(([, item]) => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    return typeof record.category === 'string'
      && typeof record.label === 'string'
      && typeof record.title === 'string'
      && typeof record.content === 'string';
  });
}

function cloneLibrary(library: Record<string, ContentItem>): Record<string, ContentItem> {
  return { ...library };
}

async function readLibraryFromKv(key: string): Promise<Record<string, ContentItem> | null> {
  try {
    const value = await kvGet<unknown>(key);
    return isContentLibrary(value) ? value : null;
  } catch (error) {
    console.warn(`Failed to read library from KV key "${key}"`, error);
    return null;
  }
}

async function loadContentLibraryInternal(): Promise<Record<string, ContentItem>> {
  const fromKv = await readLibraryFromKv(LIBRARY_KV_KEY);
  if (fromKv) {
    return fromKv;
  }

  const fromLegacyKv = await readLibraryFromKv(LEGACY_LIBRARY_KEY);
  if (fromLegacyKv) {
    await saveContentLibrary(fromLegacyKv);
    return fromLegacyKv;
  }

  const fromLegacyLocal = readLegacyLocalStorage<unknown>(LEGACY_LIBRARY_KEY);
  if (isContentLibrary(fromLegacyLocal)) {
    await saveContentLibrary(fromLegacyLocal);
    return fromLegacyLocal;
  }

  const seeded = cloneLibrary(DEFAULT_CONTENT_LIBRARY);
  await saveContentLibrary(seeded);
  return seeded;
}

/** Load once per session; concurrent callers share the same promise. */
export function loadContentLibrary(): Promise<Record<string, ContentItem>> {
  if (!libraryLoadPromise) {
    libraryLoadPromise = loadContentLibraryInternal().catch((error) => {
      libraryLoadPromise = null;
      console.error('Failed to load content library', error);
      return cloneLibrary(DEFAULT_CONTENT_LIBRARY);
    });
  }
  return libraryLoadPromise;
}

export async function saveContentLibrary(library: Record<string, ContentItem>): Promise<void> {
  if (!isContentLibrary(library)) {
    return;
  }
  try {
    await kvSet(LIBRARY_KV_KEY, library);
  } catch (error) {
    console.error('Failed to save content library', error);
    throw error;
  }
}

export async function loadSessionData(): Promise<SessionData | null> {
  try {
    const fromKv = await kvGet<SessionData>(SESSION_KV_KEY);
    if (fromKv) {
      return fromKv;
    }

    const fromLegacyKv = await kvGet<SessionData>(LEGACY_SESSION_KEY);
    if (fromLegacyKv) {
      await kvSet(SESSION_KV_KEY, fromLegacyKv);
      return fromLegacyKv;
    }
  } catch (error) {
    console.warn('Failed to read session from KV', error);
  }

  return readLegacyLocalStorage<SessionData>(LEGACY_SESSION_KEY);
}

export async function saveSessionData(session: SessionData): Promise<void> {
  try {
    await kvSet(SESSION_KV_KEY, session);
  } catch (error) {
    console.error('Failed to save session data', error);
    throw error;
  }
}
