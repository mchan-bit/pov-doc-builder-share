declare global {
  interface Window {
    CRIBL_API_URL?: string;
  }
}

function apiBase(): string {
  if (!window.CRIBL_API_URL) {
    throw new Error('CRIBL_API_URL is not set — pack deployment requires Cribl Cloud');
  }
  return window.CRIBL_API_URL;
}

export function isCriblCloud(): boolean {
  return typeof window !== 'undefined' && !!window.CRIBL_API_URL;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API GET ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export interface WorkerGroup {
  id: string;
  name?: string;
  description?: string;
  isSearch?: boolean;
  isFleet?: boolean;
}

export interface CriblPack {
  id: string;
  displayName?: string;
  version?: string;
  author?: string;
  description?: string;
  source?: string;
}

export interface RouteEntry {
  id: string;
  name?: string;
  filter?: string;
  pipeline?: string;
  output?: string;
  final?: boolean;
  disabled?: boolean;
  description?: string;
}

export interface CriblInput {
  id: string;
  type?: string;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface CriblOutput {
  id: string;
  type?: string;
  disabled?: boolean;
  [key: string]: unknown;
}

interface CountedResponse<T> {
  items: T[];
  count: number;
}

export async function listWorkerGroups(): Promise<WorkerGroup[]> {
  const data = await apiGet<CountedResponse<WorkerGroup>>('/master/groups');
  return data.items ?? [];
}

export async function listPacks(groupId: string): Promise<CriblPack[]> {
  const data = await apiGet<CountedResponse<CriblPack>>(`/m/${encodeURIComponent(groupId)}/packs`);
  return data.items ?? [];
}

export async function installPack(
  groupId: string,
  packId: string,
): Promise<CriblPack> {
  const data = await apiPost<CountedResponse<CriblPack>>(
    `/m/${encodeURIComponent(groupId)}/packs`,
    { id: packId },
  );
  const installed = data.items?.[0];
  if (!installed) throw new Error(`Pack install returned no result for ${packId}`);
  return installed;
}

export interface RoutingTable {
  id: string;
  routes: RouteEntry[];
}

export async function listRoutingTables(groupId: string): Promise<RoutingTable[]> {
  const data = await apiGet<CountedResponse<RoutingTable>>(
    `/m/${encodeURIComponent(groupId)}/routes`,
  );
  return data.items ?? [];
}

export async function listRoutes(groupId: string): Promise<RouteEntry[]> {
  const tables = await listRoutingTables(groupId);
  return tables[0]?.routes ?? [];
}

export async function getRoutingTableId(groupId: string): Promise<string> {
  const tables = await listRoutingTables(groupId);
  return tables[0]?.id ?? 'default';
}

export async function appendRoute(
  groupId: string,
  route: Omit<RouteEntry, 'id'>,
  tableId?: string,
): Promise<void> {
  const tid = tableId ?? await getRoutingTableId(groupId);
  await apiPost(
    `/m/${encodeURIComponent(groupId)}/routes/${encodeURIComponent(tid)}/append`,
    [route],
  );
}

export async function listInputs(groupId: string): Promise<CriblInput[]> {
  const data = await apiGet<CountedResponse<CriblInput>>(
    `/m/${encodeURIComponent(groupId)}/system/inputs`,
  );
  return data.items ?? [];
}

export async function createInput(
  groupId: string,
  config: Record<string, unknown>,
): Promise<CriblInput> {
  const data = await apiPost<CountedResponse<CriblInput>>(
    `/m/${encodeURIComponent(groupId)}/system/inputs`,
    config,
  );
  const created = data.items?.[0];
  if (!created) throw new Error('Input creation returned no result');
  return created;
}

export async function listOutputs(groupId: string): Promise<CriblOutput[]> {
  const data = await apiGet<CountedResponse<CriblOutput>>(
    `/m/${encodeURIComponent(groupId)}/system/outputs`,
  );
  return data.items ?? [];
}

export async function createOutput(
  groupId: string,
  config: Record<string, unknown>,
): Promise<CriblOutput> {
  const data = await apiPost<CountedResponse<CriblOutput>>(
    `/m/${encodeURIComponent(groupId)}/system/outputs`,
    config,
  );
  const created = data.items?.[0];
  if (!created) throw new Error('Output creation returned no result');
  return created;
}
