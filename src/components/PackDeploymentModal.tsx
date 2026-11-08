import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PovSource, PovDestination, PovUseCases, RoutingEntry } from '../types';
import { getRecommendedPacks, type PackRecommendation } from '../data/packMappings';
import {
  mapPovSources,
  mapPovDestinations,
  type SourceDeploymentRow,
  type DestinationDeploymentRow,
  type EditableConfig,
} from '../data/deploymentMappings';
import {
  isCriblCloud,
  listWorkerGroups,
  listPacks,
  installPack,
  listInputs,
  listOutputs,
  createInput,
  createOutput,
  type WorkerGroup,
} from '../services/criblApi';
import { resolveSourceLabel, resolveDestinationLabel } from '../useCases/keys';

type DeploymentTab = 'packs' | 'sources-destinations';

type PackStatus = 'checking' | 'installed' | 'not_installed' | 'installing' | 'error' | 'just_installed';

type ResourceStatus = 'checking' | 'exists' | 'not_created' | 'creating' | 'created' | 'error' | 'unknown_type';

interface PackRow {
  recommendation: PackRecommendation;
  status: PackStatus;
  selected: boolean;
  installedVersion?: string;
  error?: string;
}

interface DeploymentLog {
  id: string;
  displayName: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

interface ResourceRowConfig {
  host: string;
  port: string;
  url: string;
  tls: boolean;
}

interface SourceRow {
  mapping: SourceDeploymentRow;
  status: ResourceStatus;
  selected: boolean;
  error?: string;
  config: ResourceRowConfig;
}

interface DestRow {
  mapping: DestinationDeploymentRow;
  status: ResourceStatus;
  selected: boolean;
  error?: string;
  config: ResourceRowConfig;
}

export interface PackDeploymentModalProps {
  povSources: PovSource[];
  povDestinations: PovDestination[];
  useCases: PovUseCases;
  onClose: () => void;
}

function initConfig(ec?: EditableConfig): ResourceRowConfig {
  if (ec?.kind === 'hostport') {
    return { host: ec.defaultHost, port: String(ec.defaultPort), url: '', tls: false };
  }
  if (ec?.kind === 'url') {
    return { host: '', port: '', url: ec.defaultUrl, tls: false };
  }
  return { host: '', port: '', url: '', tls: false };
}

function buildInputPayload(
  row: SourceRow,
): Record<string, unknown> {
  const { mapping, config } = row;
  const payload: Record<string, unknown> = {
    id: mapping.suggestedId,
    type: mapping.criblType,
    disabled: true,
    ...mapping.defaultConfig,
  };

  const ec = mapping.editableConfig;
  if (ec?.kind === 'hostport') {
    payload.host = config.host;
    const portNum = parseInt(config.port, 10);
    if (!isNaN(portNum)) {
      for (const field of ec.portFields ?? ['port']) {
        payload[field] = portNum;
      }
    }
    if (config.tls) {
      payload.tls = { disabled: false };
    }
  }

  return payload;
}

function buildOutputPayload(
  row: DestRow,
): Record<string, unknown> {
  const { mapping, config } = row;
  const payload: Record<string, unknown> = {
    id: mapping.suggestedId,
    type: mapping.criblType,
    ...mapping.defaultConfig,
  };

  const ec = mapping.editableConfig;
  if (ec?.kind === 'hostport') {
    payload.host = config.host;
    const portNum = parseInt(config.port, 10);
    if (!isNaN(portNum)) {
      payload.port = portNum;
    }
    if (config.tls) {
      payload.tls = { disabled: false };
    }
  } else if (ec?.kind === 'url') {
    if (config.url) payload.url = config.url;
    if (config.tls) {
      payload.tls = { disabled: false };
    }
  }

  return payload;
}

function StatusBadge({ status }: { status: PackStatus | ResourceStatus }) {
  const configs: Record<string, { bg: string; text: string; dot: string; label: string; animate?: boolean }> = {
    checking: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Checking', animate: true },
    installed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Installed' },
    just_installed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Deployed' },
    not_installed: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Not Installed' },
    installing: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Installing', animate: true },
    error: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Error' },
    exists: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Exists' },
    not_created: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Not Created' },
    creating: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Creating', animate: true },
    created: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Created' },
    unknown_type: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Unknown Type' },
  };
  const c = configs[status];
  if (!c) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${c.bg} ${c.text} shrink-0`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.animate ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  );
}

function RoutingSummaryTable({
  routing,
  povSources,
  povDestinations,
}: {
  routing: RoutingEntry[];
  povSources: PovSource[];
  povDestinations: PovDestination[];
}) {
  if (routing.length === 0) return null;
  return (
    <div className="mt-4">
      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2 px-1">
        POV Routing Summary
      </h4>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-2.5 text-left text-[9px] font-black uppercase tracking-wider">Source</th>
              <th className="p-2.5 text-left text-[9px] font-black uppercase tracking-wider">Fidelity</th>
              <th className="p-2.5 text-left text-[9px] font-black uppercase tracking-wider">Destination</th>
            </tr>
          </thead>
          <tbody>
            {routing.map((entry, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2.5 font-medium text-slate-700">{resolveSourceLabel(povSources, entry.sourceKey)}</td>
                <td className="p-2.5 font-medium text-slate-600">{entry.fidelity}</td>
                <td className="p-2.5 font-medium text-slate-700">{resolveDestinationLabel(povDestinations, entry.destinationKey)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabBar({ tab, onChange }: { tab: DeploymentTab; onChange: (t: DeploymentTab) => void }) {
  const tabs: { key: DeploymentTab; label: string }[] = [
    { key: 'packs', label: 'Packs' },
    { key: 'sources-destinations', label: 'Sources & Destinations' },
  ];
  return (
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            tab === t.key
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function CommitDeployReminder() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
      <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">
          Commit & Deploy Required
        </p>
        <p className="text-[10px] text-amber-700 mt-0.5">
          Resources have been created but are not yet active.
          Go to your Worker Group settings in Cribl Cloud to commit and deploy the changes.
        </p>
      </div>
    </div>
  );
}

function HostPortFields({
  config,
  disabled,
  onChange,
}: {
  config: ResourceRowConfig;
  disabled: boolean;
  onChange: (update: Partial<ResourceRowConfig>) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Host</label>
        <input
          type="text"
          value={config.host}
          disabled={disabled}
          onChange={(e) => onChange({ host: e.target.value })}
          className="w-32 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-[11px] font-mono font-bold text-slate-700 disabled:opacity-50 disabled:bg-slate-100"
          placeholder="0.0.0.0"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Port</label>
        <input
          type="text"
          inputMode="numeric"
          value={config.port}
          disabled={disabled}
          onChange={(e) => onChange({ port: e.target.value.replace(/[^0-9]/g, '') })}
          className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-[11px] font-mono font-bold text-slate-700 disabled:opacity-50 disabled:bg-slate-100"
          placeholder="514"
        />
      </div>
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={config.tls}
          disabled={disabled}
          onChange={(e) => onChange({ tls: e.target.checked })}
          className="w-3.5 h-3.5 rounded text-[#2596be] border-slate-300 disabled:opacity-50"
        />
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">TLS</span>
      </label>
    </div>
  );
}

function UrlFields({
  config,
  disabled,
  onChange,
}: {
  config: ResourceRowConfig;
  disabled: boolean;
  onChange: (update: Partial<ResourceRowConfig>) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">URL</label>
        <input
          type="text"
          value={config.url}
          disabled={disabled}
          onChange={(e) => onChange({ url: e.target.value })}
          className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-[11px] font-mono font-bold text-slate-700 disabled:opacity-50 disabled:bg-slate-100"
          placeholder="https://host:port/path"
        />
      </div>
      <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
        <input
          type="checkbox"
          checked={config.tls}
          disabled={disabled}
          onChange={(e) => onChange({ tls: e.target.checked })}
          className="w-3.5 h-3.5 rounded text-[#2596be] border-slate-300 disabled:opacity-50"
        />
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">TLS</span>
      </label>
    </div>
  );
}

function ConfigFields({
  editableConfig,
  config,
  disabled,
  onChange,
}: {
  editableConfig?: EditableConfig;
  config: ResourceRowConfig;
  disabled: boolean;
  onChange: (update: Partial<ResourceRowConfig>) => void;
}) {
  if (!editableConfig) {
    return (
      <p className="text-[9px] font-medium text-slate-400 italic">
        Configure connection details in Cribl UI after creation.
      </p>
    );
  }
  if (editableConfig.kind === 'hostport') {
    return <HostPortFields config={config} disabled={disabled} onChange={onChange} />;
  }
  return <UrlFields config={config} disabled={disabled} onChange={onChange} />;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function PackDeploymentModal({
  povSources,
  povDestinations,
  useCases,
  onClose,
}: PackDeploymentModalProps) {
  const [activeTab, setActiveTab] = useState<DeploymentTab>('packs');

  // Shared state
  const [groups, setGroups] = useState<WorkerGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Packs tab state
  const [packRows, setPackRows] = useState<PackRow[]>([]);
  const [packDeploying, setPackDeploying] = useState(false);
  const [packDeployLog, setPackDeployLog] = useState<DeploymentLog[]>([]);
  const [showPackConfirm, setShowPackConfirm] = useState(false);

  // Sources & Destinations tab state
  const [sourceRows, setSourceRows] = useState<SourceRow[]>([]);
  const [destRows, setDestRows] = useState<DestRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [resourceDeploying, setResourceDeploying] = useState(false);
  const [resourceDeployLog, setResourceDeployLog] = useState<DeploymentLog[]>([]);
  const [showResourceConfirm, setShowResourceConfirm] = useState(false);

  const recommendations = useMemo(
    () => getRecommendedPacks(povSources, povDestinations, useCases),
    [povSources, povDestinations, useCases],
  );

  const sourceMappings = useMemo(() => mapPovSources(povSources), [povSources]);
  const destMappings = useMemo(() => mapPovDestinations(povDestinations), [povDestinations]);

  const routingEntries = useMemo(
    () => (useCases.routing.enabled ? useCases.routing.entries : []),
    [useCases.routing],
  );

  const toggleExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Load worker groups on mount
  useEffect(() => {
    if (!isCriblCloud()) {
      setError('Pack deployment is only available when running inside Cribl Cloud.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const workerGroups = await listWorkerGroups();
        if (cancelled) return;
        const streamGroups = workerGroups.filter((g) => !g.isSearch);
        setGroups(streamGroups);
        if (streamGroups.length > 0) {
          const defaultGroup = streamGroups.find((g) => g.id === 'default') ?? streamGroups[0];
          setSelectedGroup(defaultGroup.id);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load worker groups');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── Packs tab logic ───

  const checkInstalledPacks = useCallback(async (groupId: string) => {
    setPackRows(
      recommendations.map((r) => ({
        recommendation: r,
        status: 'checking',
        selected: false,
      })),
    );
    try {
      const installed = await listPacks(groupId);
      const installedIds = new Set(installed.map((p) => p.id));
      const installedMap = new Map(installed.map((p) => [p.id, p]));
      setPackRows(
        recommendations.map((r) => ({
          recommendation: r,
          status: installedIds.has(r.packId) ? 'installed' : 'not_installed',
          selected: !installedIds.has(r.packId),
          installedVersion: installedMap.get(r.packId)?.version,
        })),
      );
    } catch (err) {
      setPackRows(
        recommendations.map((r) => ({
          recommendation: r,
          status: 'error',
          selected: false,
          error: err instanceof Error ? err.message : 'Check failed',
        })),
      );
    }
  }, [recommendations]);

  useEffect(() => {
    if (selectedGroup && recommendations.length > 0) {
      void checkInstalledPacks(selectedGroup);
    }
  }, [selectedGroup, checkInstalledPacks, recommendations.length]);

  const selectedPackCount = packRows.filter((r) => r.selected && r.status === 'not_installed').length;

  const togglePack = (packId: string) => {
    setPackRows((prev) =>
      prev.map((row) =>
        row.recommendation.packId === packId && row.status === 'not_installed'
          ? { ...row, selected: !row.selected }
          : row,
      ),
    );
  };

  const handleDeployPacks = async () => {
    setShowPackConfirm(false);
    setPackDeploying(true);
    setPackDeployLog([]);

    const toDeploy = packRows.filter((r) => r.selected && r.status === 'not_installed');

    setPackRows((prev) =>
      prev.map((row) =>
        toDeploy.some((d) => d.recommendation.packId === row.recommendation.packId)
          ? { ...row, status: 'installing' }
          : row,
      ),
    );

    for (const row of toDeploy) {
      const { packId, displayName } = row.recommendation;
      try {
        await installPack(selectedGroup, packId);
        setPackRows((prev) =>
          prev.map((r) =>
            r.recommendation.packId === packId
              ? { ...r, status: 'just_installed', selected: false }
              : r,
          ),
        );
        setPackDeployLog((prev) => [
          ...prev,
          { id: packId, displayName, success: true, message: 'Installed successfully', timestamp: new Date() },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Install failed';
        setPackRows((prev) =>
          prev.map((r) =>
            r.recommendation.packId === packId
              ? { ...r, status: 'error', error: message }
              : r,
          ),
        );
        setPackDeployLog((prev) => [
          ...prev,
          { id: packId, displayName, success: false, message, timestamp: new Date() },
        ]);
      }
    }

    setPackDeploying(false);
  };

  // ─── Sources & Destinations tab logic ───

  const checkExistingResources = useCallback(async (groupId: string) => {
    setSourceRows(
      sourceMappings.map((m) => ({
        mapping: m,
        status: m.known ? 'checking' : 'unknown_type',
        selected: false,
        config: initConfig(m.editableConfig),
      })),
    );
    setDestRows(
      destMappings.map((m) => ({
        mapping: m,
        status: m.known ? 'checking' : 'unknown_type',
        selected: false,
        config: initConfig(m.editableConfig),
      })),
    );

    try {
      const [inputs, outputs] = await Promise.all([
        listInputs(groupId),
        listOutputs(groupId),
      ]);
      const inputIds = new Set(inputs.map((i) => i.id));
      const outputIds = new Set(outputs.map((o) => o.id));

      setSourceRows(
        sourceMappings.map((m) => {
          if (!m.known) return { mapping: m, status: 'unknown_type' as const, selected: false, config: initConfig(m.editableConfig) };
          const exists = inputIds.has(m.suggestedId);
          return {
            mapping: m,
            status: exists ? 'exists' : 'not_created',
            selected: !exists,
            config: initConfig(m.editableConfig),
          };
        }),
      );
      setDestRows(
        destMappings.map((m) => {
          if (!m.known) return { mapping: m, status: 'unknown_type' as const, selected: false, config: initConfig(m.editableConfig) };
          const exists = outputIds.has(m.suggestedId);
          return {
            mapping: m,
            status: exists ? 'exists' : 'not_created',
            selected: !exists,
            config: initConfig(m.editableConfig),
          };
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Check failed';
      setSourceRows(
        sourceMappings.map((m) => ({
          mapping: m,
          status: 'error' as const,
          selected: false,
          error: message,
          config: initConfig(m.editableConfig),
        })),
      );
      setDestRows(
        destMappings.map((m) => ({
          mapping: m,
          status: 'error' as const,
          selected: false,
          error: message,
          config: initConfig(m.editableConfig),
        })),
      );
    }
  }, [sourceMappings, destMappings]);

  useEffect(() => {
    if (selectedGroup && activeTab === 'sources-destinations' && (sourceMappings.length > 0 || destMappings.length > 0)) {
      void checkExistingResources(selectedGroup);
    }
  }, [selectedGroup, activeTab, checkExistingResources, sourceMappings.length, destMappings.length]);

  const selectedSourceCount = sourceRows.filter((r) => r.selected && r.status === 'not_created').length;
  const selectedDestCount = destRows.filter((r) => r.selected && r.status === 'not_created').length;
  const selectedResourceCount = selectedSourceCount + selectedDestCount;

  const toggleSource = (id: string) => {
    setSourceRows((prev) =>
      prev.map((row) =>
        row.mapping.suggestedId === id && row.status === 'not_created'
          ? { ...row, selected: !row.selected }
          : row,
      ),
    );
  };

  const toggleDest = (id: string) => {
    setDestRows((prev) =>
      prev.map((row) =>
        row.mapping.suggestedId === id && row.status === 'not_created'
          ? { ...row, selected: !row.selected }
          : row,
      ),
    );
  };

  const updateSourceConfig = (id: string, update: Partial<ResourceRowConfig>) => {
    setSourceRows((prev) =>
      prev.map((row) =>
        row.mapping.suggestedId === id
          ? { ...row, config: { ...row.config, ...update } }
          : row,
      ),
    );
  };

  const updateDestConfig = (id: string, update: Partial<ResourceRowConfig>) => {
    setDestRows((prev) =>
      prev.map((row) =>
        row.mapping.suggestedId === id
          ? { ...row, config: { ...row.config, ...update } }
          : row,
      ),
    );
  };

  const selectAllResources = () => {
    setSourceRows((prev) => prev.map((row) => row.status === 'not_created' ? { ...row, selected: true } : row));
    setDestRows((prev) => prev.map((row) => row.status === 'not_created' ? { ...row, selected: true } : row));
  };

  const deselectAllResources = () => {
    setSourceRows((prev) => prev.map((row) => row.status === 'not_created' ? { ...row, selected: false } : row));
    setDestRows((prev) => prev.map((row) => row.status === 'not_created' ? { ...row, selected: false } : row));
  };

  const handleDeployResources = async () => {
    setShowResourceConfirm(false);
    setResourceDeploying(true);
    setResourceDeployLog([]);

    const sourcesToDeploy = sourceRows.filter((r) => r.selected && r.status === 'not_created');
    const destsToDeploy = destRows.filter((r) => r.selected && r.status === 'not_created');

    setSourceRows((prev) =>
      prev.map((row) =>
        sourcesToDeploy.some((d) => d.mapping.suggestedId === row.mapping.suggestedId)
          ? { ...row, status: 'creating' }
          : row,
      ),
    );
    setDestRows((prev) =>
      prev.map((row) =>
        destsToDeploy.some((d) => d.mapping.suggestedId === row.mapping.suggestedId)
          ? { ...row, status: 'creating' }
          : row,
      ),
    );

    for (const row of sourcesToDeploy) {
      const { suggestedId, criblLabel } = row.mapping;
      const displayName = `${row.mapping.povSource.dataType} (${criblLabel})`;
      try {
        await createInput(selectedGroup, buildInputPayload(row));
        setSourceRows((prev) =>
          prev.map((r) =>
            r.mapping.suggestedId === suggestedId
              ? { ...r, status: 'created', selected: false }
              : r,
          ),
        );
        setResourceDeployLog((prev) => [
          ...prev,
          { id: suggestedId, displayName, success: true, message: 'Source created', timestamp: new Date() },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Creation failed';
        setSourceRows((prev) =>
          prev.map((r) =>
            r.mapping.suggestedId === suggestedId
              ? { ...r, status: 'error', error: message }
              : r,
          ),
        );
        setResourceDeployLog((prev) => [
          ...prev,
          { id: suggestedId, displayName, success: false, message, timestamp: new Date() },
        ]);
      }
    }

    for (const row of destsToDeploy) {
      const { suggestedId, criblLabel } = row.mapping;
      const displayName = `${row.mapping.povDestination.siemSoa} (${criblLabel})`;
      try {
        await createOutput(selectedGroup, buildOutputPayload(row));
        setDestRows((prev) =>
          prev.map((r) =>
            r.mapping.suggestedId === suggestedId
              ? { ...r, status: 'created', selected: false }
              : r,
          ),
        );
        setResourceDeployLog((prev) => [
          ...prev,
          { id: suggestedId, displayName, success: true, message: 'Destination created', timestamp: new Date() },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Creation failed';
        setDestRows((prev) =>
          prev.map((r) =>
            r.mapping.suggestedId === suggestedId
              ? { ...r, status: 'error', error: message }
              : r,
          ),
        );
        setResourceDeployLog((prev) => [
          ...prev,
          { id: suggestedId, displayName, success: false, message, timestamp: new Date() },
        ]);
      }
    }

    setResourceDeploying(false);
  };

  // ─── Render ───

  const hasRecommendations = recommendations.length > 0;
  const hasResources = sourceMappings.length > 0 || destMappings.length > 0;
  const isDeploying = packDeploying || resourceDeploying;
  const anyPackSuccess = packDeployLog.some((e) => e.success);
  const anyResourceSuccess = resourceDeployLog.some((e) => e.success);

  const renderResourceRow = (
    row: SourceRow | DestRow,
    kind: 'source' | 'dest',
  ) => {
    const id = row.mapping.suggestedId;
    const isSource = kind === 'source';
    const srcRow = isSource ? (row as SourceRow) : null;
    const dstRow = !isSource ? (row as DestRow) : null;
    const primaryLabel = srcRow
      ? srcRow.mapping.povSource.dataType
      : dstRow!.mapping.povDestination.siemSoa;
    const secondaryLabel = srcRow
      ? srcRow.mapping.povSource.source
      : dstRow!.mapping.povDestination.destination;
    const ec = row.mapping.editableConfig;
    const isExpanded = expandedRows.has(id);
    const canEdit = row.status === 'not_created' && !isDeploying;

    return (
      <div
        key={id}
        className={`rounded-xl border transition-colors ${
          row.status === 'created'
            ? 'bg-emerald-50 border-emerald-200'
            : row.status === 'error'
            ? 'bg-red-50 border-red-200'
            : row.status === 'unknown_type'
            ? 'bg-slate-50 border-slate-200 opacity-60'
            : row.selected && row.status === 'not_created'
            ? 'bg-blue-50 border-blue-200'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <input
            type="checkbox"
            checked={row.selected}
            disabled={row.status !== 'not_created' || isDeploying}
            onChange={() => isSource ? toggleSource(id) : toggleDest(id)}
            className="w-4 h-4 rounded text-[#2596be] border-slate-300 disabled:opacity-40 shrink-0"
          />
          <button
            type="button"
            onClick={() => toggleExpanded(id)}
            className="shrink-0 p-0.5 hover:bg-slate-200/50 rounded transition-colors"
          >
            <ChevronIcon expanded={isExpanded} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 truncate">{primaryLabel}</span>
              <span className="text-[9px] text-slate-400">via</span>
              <span className="text-[10px] font-bold text-slate-600 truncate">{secondaryLabel}</span>
            </div>
            <p className="text-[9px] font-medium text-slate-400 mt-0.5">
              Cribl type: <span className="font-mono font-bold text-slate-500">{row.mapping.criblType || '—'}</span>
              {ec?.kind === 'hostport' && row.config.host && (
                <>
                  {' · '}
                  <span className="font-mono text-slate-500">{row.config.host}:{row.config.port}</span>
                </>
              )}
              {ec?.kind === 'url' && row.config.url && (
                <>
                  {' · '}
                  <span className="font-mono text-slate-500 truncate">{row.config.url}</span>
                </>
              )}
              {row.config.tls && (
                <>
                  {' · '}
                  <span className="font-bold text-emerald-600">TLS</span>
                </>
              )}
            </p>
            {row.error && (
              <p className="text-[9px] font-medium text-red-500 mt-0.5">{row.error}</p>
            )}
          </div>
          <StatusBadge status={row.status} />
        </div>

        {/* Expanded config */}
        {isExpanded && (
          <div className="px-4 pb-3 pt-0 ml-[4.25rem]">
            <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
              <ConfigFields
                editableConfig={ec}
                config={row.config}
                disabled={!canEdit}
                onChange={(update) =>
                  isSource
                    ? updateSourceConfig(id, update)
                    : updateDestConfig(id, update)
                }
              />
              <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
                ID: <span className="font-mono">{id}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-3xl font-black uppercase text-slate-900">Deployment</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Deploy packs, sources, and destinations to Cribl Cloud
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            ✕
          </button>
        </div>

        {/* Non-Cloud or Error States */}
        {error && !isCriblCloud() ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 15v2m0 0v2m0-2h2m-2 0H10m-2.5-8.5L12 3l4.5 5.5M3 21h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h4 className="font-black text-slate-700 uppercase text-sm mb-2">Cribl Cloud Required</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Deployment is available when this app is installed in a Cribl Cloud organization.
              Install the app via the Cribl App Platform to enable this feature.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-[#2596be] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading worker groups...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-xs text-red-600 font-bold">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); }}
              className="mt-4 px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Worker Group Selector (shared) */}
            <div className="mb-5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 block mb-1.5">
                Worker Group
              </label>
              <select
                className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 font-bold text-sm"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                disabled={isDeploying}
              >
                {groups.length === 0 && <option value="">No groups found</option>}
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name || g.id}
                    {g.description ? ` — ${g.description}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tab Bar */}
            <TabBar tab={activeTab} onChange={setActiveTab} />

            {/* ═══ Packs Tab ═══ */}
            {activeTab === 'packs' && (
              <div className="space-y-5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-2">
                {!hasRecommendations ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500">No pack recommendations available.</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Add sources in POV Sources and Destinations to get pack suggestions.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                          Recommended Packs ({packRows.length})
                        </h4>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPackRows((prev) => prev.map((row) => row.status === 'not_installed' ? { ...row, selected: true } : row))}
                            disabled={isDeploying}
                            className="text-[9px] font-black text-[#2596be] uppercase tracking-wider hover:underline disabled:opacity-50"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setPackRows((prev) => prev.map((row) => row.status === 'not_installed' ? { ...row, selected: false } : row))}
                            disabled={isDeploying}
                            className="text-[9px] font-black text-slate-400 uppercase tracking-wider hover:underline disabled:opacity-50"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {packRows.map((row) => (
                          <div
                            key={row.recommendation.packId}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                              row.status === 'just_installed'
                                ? 'bg-emerald-50 border-emerald-200'
                                : row.status === 'error'
                                ? 'bg-red-50 border-red-200'
                                : row.selected && row.status === 'not_installed'
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={row.selected}
                              disabled={row.status !== 'not_installed' || isDeploying}
                              onChange={() => togglePack(row.recommendation.packId)}
                              className="w-4 h-4 rounded text-[#2596be] border-slate-300 disabled:opacity-40"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {row.recommendation.displayName}
                                </span>
                                {row.installedVersion && (
                                  <span className="text-[9px] font-bold text-slate-400">
                                    v{row.installedVersion}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">
                                {row.recommendation.description}
                              </p>
                              <p className="text-[9px] font-medium text-slate-400 mt-0.5">
                                {row.recommendation.reason}
                              </p>
                              {row.error && (
                                <p className="text-[9px] font-medium text-red-500 mt-0.5">
                                  {row.error}
                                </p>
                              )}
                            </div>
                            <StatusBadge status={row.status} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <RoutingSummaryTable
                      routing={routingEntries}
                      povSources={povSources}
                      povDestinations={povDestinations}
                    />

                    {packDeployLog.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2 px-1">
                          Deployment Log
                        </h4>
                        <div className="space-y-1.5">
                          {packDeployLog.map((entry, i) => (
                            <div
                              key={i}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold ${
                                entry.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${entry.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="font-black">{entry.displayName}</span>
                              <span className="flex-1 text-right opacity-75">{entry.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {anyPackSuccess && !packDeploying && <CommitDeployReminder />}
                  </>
                )}
              </div>
            )}

            {/* ═══ Sources & Destinations Tab ═══ */}
            {activeTab === 'sources-destinations' && (
              <div className="space-y-5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-2">
                {!hasResources ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500">No sources or destinations configured.</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Add sources and destinations in POV Sources and Destinations first.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                        Resources ({sourceMappings.length + destMappings.length})
                      </h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllResources}
                          disabled={isDeploying}
                          className="text-[9px] font-black text-[#2596be] uppercase tracking-wider hover:underline disabled:opacity-50"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={deselectAllResources}
                          disabled={isDeploying}
                          className="text-[9px] font-black text-slate-400 uppercase tracking-wider hover:underline disabled:opacity-50"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {/* Sources */}
                    {sourceRows.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-[#2596be] uppercase tracking-[0.15em] mb-2 px-1 flex items-center gap-2">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Sources ({sourceRows.length})
                        </h4>
                        <div className="space-y-2">
                          {sourceRows.map((row) => renderResourceRow(row, 'source'))}
                        </div>
                      </div>
                    )}

                    {/* Destinations */}
                    {destRows.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-[#2596be] uppercase tracking-[0.15em] mb-2 px-1 flex items-center gap-2">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          Destinations ({destRows.length})
                        </h4>
                        <div className="space-y-2">
                          {destRows.map((row) => renderResourceRow(row, 'dest'))}
                        </div>
                      </div>
                    )}

                    {/* Info note */}
                    {selectedResourceCount > 0 && !resourceDeploying && (
                      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div>
                          <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider">
                            Sources Created as Disabled
                          </p>
                          <p className="text-[10px] text-blue-700 mt-0.5">
                            Sources are created in a disabled state. Expand each row to configure host, port, and TLS before deploying. Enable them in the Cribl UI when ready.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Resource deploy log */}
                    {resourceDeployLog.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2 px-1">
                          Deployment Log
                        </h4>
                        <div className="space-y-1.5">
                          {resourceDeployLog.map((entry, i) => (
                            <div
                              key={i}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold ${
                                entry.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${entry.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="font-black">{entry.displayName}</span>
                              <span className="flex-1 text-right opacity-75">{entry.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {anyResourceSuccess && !resourceDeploying && <CommitDeployReminder />}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex gap-3 mt-8">
          {activeTab === 'packs' && hasRecommendations && selectedPackCount > 0 && !isDeploying && isCriblCloud() && (
            <button
              onClick={() => setShowPackConfirm(true)}
              className="flex-1 py-6 bg-[#2596be] text-white font-black uppercase tracking-widest rounded-3xl shadow-xl hover:bg-[#1a7696] transition-all active:scale-[0.98]"
            >
              Deploy {selectedPackCount} Pack{selectedPackCount === 1 ? '' : 's'}
            </button>
          )}

          {activeTab === 'sources-destinations' && hasResources && selectedResourceCount > 0 && !isDeploying && isCriblCloud() && (
            <button
              onClick={() => setShowResourceConfirm(true)}
              className="flex-1 py-6 bg-[#2596be] text-white font-black uppercase tracking-widest rounded-3xl shadow-xl hover:bg-[#1a7696] transition-all active:scale-[0.98]"
            >
              Deploy {selectedResourceCount} Resource{selectedResourceCount === 1 ? '' : 's'}
            </button>
          )}

          {isDeploying && (
            <div className="flex-1 py-6 bg-slate-200 text-slate-500 font-black uppercase tracking-widest rounded-3xl text-center">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin" />
                Deploying...
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            className={`${
              !isDeploying && (
                (activeTab === 'packs' && hasRecommendations && selectedPackCount > 0) ||
                (activeTab === 'sources-destinations' && hasResources && selectedResourceCount > 0)
              )
                ? 'px-8 py-6 bg-slate-100 text-slate-500'
                : 'flex-1 py-6 bg-[#2596be] text-white hover:bg-[#1a7696]'
            } font-black uppercase tracking-widest rounded-3xl shadow-xl transition-all active:scale-[0.98]`}
          >
            {(anyPackSuccess || anyResourceSuccess) ? 'Done' : 'Close'}
          </button>
        </div>

        {/* ─── Pack Confirmation Dialog ─── */}
        {showPackConfirm && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowPackConfirm(false)}
          >
            <div
              className="bg-white p-8 rounded-[2rem] shadow-2xl border border-blue-100 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-blue-50 text-[#2596be] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h4 className="font-black text-slate-900 uppercase mb-2">Deploy Packs?</h4>
              <p className="text-xs text-slate-500 mb-2">
                This will install {selectedPackCount} pack{selectedPackCount === 1 ? '' : 's'} to
                worker group <strong>{selectedGroup}</strong>.
              </p>
              <div className="text-left bg-slate-50 rounded-xl p-3 mb-6 max-h-32 overflow-y-auto">
                {packRows
                  .filter((r) => r.selected && r.status === 'not_installed')
                  .map((r) => (
                    <p key={r.recommendation.packId} className="text-[10px] font-bold text-slate-600 py-0.5">
                      • {r.recommendation.displayName}
                    </p>
                  ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDeployPacks}
                  className="flex-1 py-3 bg-[#2596be] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1a7696] transition-all"
                >
                  Deploy
                </button>
                <button
                  onClick={() => setShowPackConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Resource Confirmation Dialog ─── */}
        {showResourceConfirm && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowResourceConfirm(false)}
          >
            <div
              className="bg-white p-8 rounded-[2rem] shadow-2xl border border-blue-100 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-blue-50 text-[#2596be] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h4 className="font-black text-slate-900 uppercase mb-2">Create Resources?</h4>
              <p className="text-xs text-slate-500 mb-2">
                This will create {selectedResourceCount} resource{selectedResourceCount === 1 ? '' : 's'} in
                worker group <strong>{selectedGroup}</strong>.
              </p>
              <div className="text-left bg-slate-50 rounded-xl p-3 mb-6 max-h-40 overflow-y-auto">
                {selectedSourceCount > 0 && (
                  <>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Sources</p>
                    {sourceRows
                      .filter((r) => r.selected && r.status === 'not_created')
                      .map((r) => {
                        const ec = r.mapping.editableConfig;
                        const detail = ec?.kind === 'hostport'
                          ? ` — ${r.config.host}:${r.config.port}${r.config.tls ? ' (TLS)' : ''}`
                          : ec?.kind === 'url' && r.config.url
                          ? ` — ${r.config.url}${r.config.tls ? ' (TLS)' : ''}`
                          : '';
                        return (
                          <p key={r.mapping.suggestedId} className="text-[10px] font-bold text-slate-600 py-0.5 pl-2">
                            • {r.mapping.povSource.dataType} ({r.mapping.criblLabel}){detail}
                          </p>
                        );
                      })}
                  </>
                )}
                {selectedDestCount > 0 && (
                  <>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 mt-2">Destinations</p>
                    {destRows
                      .filter((r) => r.selected && r.status === 'not_created')
                      .map((r) => {
                        const ec = r.mapping.editableConfig;
                        const detail = ec?.kind === 'hostport'
                          ? ` — ${r.config.host}:${r.config.port}${r.config.tls ? ' (TLS)' : ''}`
                          : ec?.kind === 'url' && r.config.url
                          ? ` — ${r.config.url}${r.config.tls ? ' (TLS)' : ''}`
                          : '';
                        return (
                          <p key={r.mapping.suggestedId} className="text-[10px] font-bold text-slate-600 py-0.5 pl-2">
                            • {r.mapping.povDestination.siemSoa} ({r.mapping.criblLabel}){detail}
                          </p>
                        );
                      })}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDeployResources}
                  className="flex-1 py-3 bg-[#2596be] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1a7696] transition-all"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowResourceConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
