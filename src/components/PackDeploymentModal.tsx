import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PovSource, PovDestination, PovUseCases, RoutingEntry } from '../types';
import { getRecommendedPacks, type PackRecommendation } from '../data/packMappings';
import {
  mapPovSources,
  mapPovDestinations,
  buildPayloadFromFields,
  type SourceDeploymentRow,
  type DestinationDeploymentRow,
  type ConfigField,
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
  listRoutes,
  appendRoute,
  getRoutingTableId,
  type WorkerGroup,
} from '../services/criblApi';
import { resolveSourceLabel, resolveDestinationLabel, povSourceKey, povDestinationKey } from '../useCases/keys';

type DeploymentTab = 'packs' | 'sources-destinations' | 'routes';

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

interface SourceRow {
  mapping: SourceDeploymentRow;
  status: ResourceStatus;
  selected: boolean;
  error?: string;
  fieldValues: Record<string, string | number | boolean>;
}

interface DestRow {
  mapping: DestinationDeploymentRow;
  status: ResourceStatus;
  selected: boolean;
  error?: string;
  fieldValues: Record<string, string | number | boolean>;
}

interface RouteMappingRow {
  routingEntry: RoutingEntry;
  sourceLabel: string;
  sourceInputId: string;
  packLabel: string;
  pipelineId: string;
  destLabel: string;
  destOutputId: string;
}

interface RouteRow {
  mapping: RouteMappingRow;
  status: ResourceStatus;
  selected: boolean;
  error?: string;
}

export interface PackDeploymentModalProps {
  povSources: PovSource[];
  povDestinations: PovDestination[];
  useCases: PovUseCases;
  onClose: () => void;
}

function initFieldValues(fields: ConfigField[]): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};
  for (const field of fields) {
    values[field.key] = field.default ?? (field.type === 'boolean' ? false : field.type === 'number' ? 0 : '');
  }
  return values;
}

function fieldSummary(_fields: ConfigField[], values: Record<string, string | number | boolean>): string {
  const parts: string[] = [];

  const host = values.host;
  const port = values.port;
  if (host && port) parts.push(`${host}:${port}`);
  else if (host) parts.push(String(host));

  const url = values.url;
  if (url) parts.push(String(url));

  const bucket = values.bucket;
  if (bucket) parts.push(`bucket: ${bucket}`);

  const brokers = values._brokers;
  if (brokers) parts.push(`brokers: ${brokers}`);

  const topic = values.topic;
  if (topic) parts.push(`topic: ${topic}`);

  const index = values.index;
  if (index) parts.push(`index: ${index}`);

  const region = values.region;
  if (region && !host && !url) parts.push(`region: ${region}`);

  if (values._tls === true) parts.push('TLS');

  return parts.join(' · ');
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
    { key: 'routes', label: 'Routes' },
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

function FieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ConfigField;
  value: string | number | boolean;
  disabled: boolean;
  onChange: (key: string, val: string | number | boolean) => void;
}) {
  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value === true}
          disabled={disabled}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="w-3.5 h-3.5 rounded text-[#2596be] border-slate-300 disabled:opacity-50"
        />
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{field.label}</span>
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="flex items-center gap-1.5">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{field.label}</label>
        <select
          value={String(value)}
          disabled={disabled}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-[11px] font-bold text-slate-700 disabled:opacity-50 disabled:bg-slate-100"
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${field.wide ? 'flex-1 min-w-0' : ''}`}>
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={field.type === 'number' ? 'text' : 'text'}
        inputMode={field.type === 'number' ? 'numeric' : undefined}
        value={String(value ?? '')}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          if (field.type === 'number') {
            const cleaned = raw.replace(/[^0-9]/g, '');
            onChange(field.key, cleaned === '' ? '' : parseInt(cleaned, 10));
          } else {
            onChange(field.key, raw);
          }
        }}
        placeholder={field.placeholder}
        className={`${field.wide ? 'flex-1 min-w-0' : field.type === 'number' ? 'w-20' : 'w-40'} px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-[11px] font-mono font-bold text-slate-700 disabled:opacity-50 disabled:bg-slate-100`}
      />
    </div>
  );
}

function ConfigFieldsPanel({
  fields,
  values,
  disabled,
  onChange,
}: {
  fields: ConfigField[];
  values: Record<string, string | number | boolean>;
  disabled: boolean;
  onChange: (key: string, val: string | number | boolean) => void;
}) {
  if (fields.length === 0) {
    return (
      <p className="text-[9px] font-medium text-slate-400 italic">
        Configure connection details in Cribl UI after creation.
      </p>
    );
  }

  const boolFields = fields.filter((fld) => fld.type === 'boolean');
  const otherFields = fields.filter((fld) => fld.type !== 'boolean');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {otherFields.map((field) => (
          <FieldInput key={field.key} field={field} value={values[field.key] ?? field.default ?? ''} disabled={disabled} onChange={onChange} />
        ))}
      </div>
      {boolFields.length > 0 && (
        <div className="flex items-center gap-4">
          {boolFields.map((field) => (
            <FieldInput key={field.key} field={field} value={values[field.key] ?? false} disabled={disabled} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PackDeploymentModal({
  povSources,
  povDestinations,
  useCases,
  onClose,
}: PackDeploymentModalProps) {
  const [activeTab, setActiveTab] = useState<DeploymentTab>('packs');

  const [groups, setGroups] = useState<WorkerGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [packRows, setPackRows] = useState<PackRow[]>([]);
  const [packDeploying, setPackDeploying] = useState(false);
  const [packDeployLog, setPackDeployLog] = useState<DeploymentLog[]>([]);
  const [showPackConfirm, setShowPackConfirm] = useState(false);

  const [sourceRows, setSourceRows] = useState<SourceRow[]>([]);
  const [destRows, setDestRows] = useState<DestRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [resourceDeploying, setResourceDeploying] = useState(false);
  const [resourceDeployLog, setResourceDeployLog] = useState<DeploymentLog[]>([]);
  const [showResourceConfirm, setShowResourceConfirm] = useState(false);

  const [routeRows, setRouteRows] = useState<RouteRow[]>([]);
  const [routeDeploying, setRouteDeploying] = useState(false);
  const [routeDeployLog, setRouteDeployLog] = useState<DeploymentLog[]>([]);
  const [showRouteConfirm, setShowRouteConfirm] = useState(false);

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
        fieldValues: initFieldValues(m.fields),
      })),
    );
    setDestRows(
      destMappings.map((m) => ({
        mapping: m,
        status: m.known ? 'checking' : 'unknown_type',
        selected: false,
        fieldValues: initFieldValues(m.fields),
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
          if (!m.known) return { mapping: m, status: 'unknown_type' as const, selected: false, fieldValues: initFieldValues(m.fields) };
          const exists = inputIds.has(m.suggestedId);
          return {
            mapping: m,
            status: exists ? 'exists' : 'not_created',
            selected: !exists,
            fieldValues: initFieldValues(m.fields),
          };
        }),
      );
      setDestRows(
        destMappings.map((m) => {
          if (!m.known) return { mapping: m, status: 'unknown_type' as const, selected: false, fieldValues: initFieldValues(m.fields) };
          const exists = outputIds.has(m.suggestedId);
          return {
            mapping: m,
            status: exists ? 'exists' : 'not_created',
            selected: !exists,
            fieldValues: initFieldValues(m.fields),
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
          fieldValues: initFieldValues(m.fields),
        })),
      );
      setDestRows(
        destMappings.map((m) => ({
          mapping: m,
          status: 'error' as const,
          selected: false,
          error: message,
          fieldValues: initFieldValues(m.fields),
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

  const updateSourceField = (rowId: string, key: string, val: string | number | boolean) => {
    setSourceRows((prev) =>
      prev.map((row) =>
        row.mapping.suggestedId === rowId
          ? { ...row, fieldValues: { ...row.fieldValues, [key]: val } }
          : row,
      ),
    );
  };

  const updateDestField = (rowId: string, key: string, val: string | number | boolean) => {
    setDestRows((prev) =>
      prev.map((row) =>
        row.mapping.suggestedId === rowId
          ? { ...row, fieldValues: { ...row.fieldValues, [key]: val } }
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
      const { suggestedId, criblType, criblLabel, defaultConfig } = row.mapping;
      const displayName = `${row.mapping.povSource.dataType} (${criblLabel})`;
      try {
        const payload = buildPayloadFromFields(
          { id: suggestedId, type: criblType, defaultConfig },
          row.fieldValues,
          true,
        );
        await createInput(selectedGroup, payload);
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
      const { suggestedId, criblType, criblLabel, defaultConfig } = row.mapping;
      const displayName = `${row.mapping.povDestination.siemSoa} (${criblLabel})`;
      try {
        const payload = buildPayloadFromFields(
          { id: suggestedId, type: criblType, defaultConfig },
          row.fieldValues,
          false,
        );
        await createOutput(selectedGroup, payload);
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

  // ─── Routes tab logic ───

  const routeMappings = useMemo((): RouteMappingRow[] => {
    if (!useCases.routing.enabled) return [];
    return routingEntries.map((entry) => {
      const srcMapping = sourceMappings.find((m) => povSourceKey(m.povSource) === entry.sourceKey);
      const dstMapping = destMappings.find((m) => povDestinationKey(m.povDestination) === entry.destinationKey);
      const dataType = srcMapping?.povSource.dataType ?? '';
      const packRec = recommendations.find((r) =>
        r.reason.toLowerCase().includes(dataType.toLowerCase()) && dataType !== '',
      );

      return {
        routingEntry: entry,
        sourceLabel: srcMapping
          ? `${srcMapping.povSource.dataType} (${srcMapping.criblLabel})`
          : resolveSourceLabel(povSources, entry.sourceKey),
        sourceInputId: srcMapping?.suggestedId ?? '',
        packLabel: packRec?.displayName ?? 'No Pack',
        pipelineId: packRec ? `${packRec.packId}:main` : 'passthru',
        destLabel: dstMapping
          ? `${dstMapping.povDestination.siemSoa} (${dstMapping.criblLabel})`
          : resolveDestinationLabel(povDestinations, entry.destinationKey),
        destOutputId: dstMapping?.suggestedId ?? '',
      };
    });
  }, [routingEntries, sourceMappings, destMappings, recommendations, povSources, povDestinations, useCases.routing.enabled]);

  const checkExistingRoutes = useCallback(async (groupId: string) => {
    setRouteRows(
      routeMappings.map((m) => ({ mapping: m, status: 'checking' as const, selected: false })),
    );
    try {
      const existingRoutes = await listRoutes(groupId);
      setRouteRows(
        routeMappings.map((m) => {
          const exists = existingRoutes.some(
            (er) =>
              er.output === m.destOutputId &&
              er.filter?.includes(m.sourceInputId) &&
              m.sourceInputId !== '',
          );
          return {
            mapping: m,
            status: exists ? ('exists' as const) : ('not_created' as const),
            selected: !exists,
          };
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Check failed';
      setRouteRows(
        routeMappings.map((m) => ({ mapping: m, status: 'error' as const, selected: false, error: message })),
      );
    }
  }, [routeMappings]);

  useEffect(() => {
    if (selectedGroup && activeTab === 'routes' && routeMappings.length > 0) {
      void checkExistingRoutes(selectedGroup);
    }
  }, [selectedGroup, activeTab, checkExistingRoutes, routeMappings.length]);

  const selectedRouteCount = routeRows.filter((r) => r.selected && r.status === 'not_created').length;

  const toggleRoute = (idx: number) => {
    setRouteRows((prev) =>
      prev.map((row, i) =>
        i === idx && row.status === 'not_created' ? { ...row, selected: !row.selected } : row,
      ),
    );
  };

  const handleDeployRoutes = async () => {
    setShowRouteConfirm(false);
    setRouteDeploying(true);
    setRouteDeployLog([]);

    const toDeploy = routeRows
      .map((r, i) => ({ ...r, idx: i }))
      .filter((r) => r.selected && r.status === 'not_created');

    setRouteRows((prev) =>
      prev.map((row, i) =>
        toDeploy.some((d) => d.idx === i) ? { ...row, status: 'creating' } : row,
      ),
    );

    let tableId: string;
    try {
      tableId = await getRoutingTableId(selectedGroup);
    } catch {
      tableId = 'default';
    }

    for (const row of toDeploy) {
      const { mapping, idx } = row;
      const displayName = `${mapping.sourceLabel} → ${mapping.destLabel}`;
      try {
        await appendRoute(selectedGroup, {
          name: `POV: ${mapping.sourceLabel} → ${mapping.destLabel}`,
          filter: `__inputId=='${mapping.sourceInputId}'`,
          pipeline: mapping.pipelineId,
          output: mapping.destOutputId,
          final: false,
          disabled: true,
          description: `POV route — fidelity: ${mapping.routingEntry.fidelity}`,
        }, tableId);
        setRouteRows((prev) =>
          prev.map((r, i) => (i === idx ? { ...r, status: 'created', selected: false } : r)),
        );
        setRouteDeployLog((prev) => [
          ...prev,
          { id: `route_${idx}`, displayName, success: true, message: 'Route created', timestamp: new Date() },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Creation failed';
        setRouteRows((prev) =>
          prev.map((r, i) => (i === idx ? { ...r, status: 'error', error: message } : r)),
        );
        setRouteDeployLog((prev) => [
          ...prev,
          { id: `route_${idx}`, displayName, success: false, message, timestamp: new Date() },
        ]);
      }
    }

    setRouteDeploying(false);
  };

  // ─── Render ───

  const hasRecommendations = recommendations.length > 0;
  const hasResources = sourceMappings.length > 0 || destMappings.length > 0;
  const hasRoutes = routeMappings.length > 0;
  const isDeploying = packDeploying || resourceDeploying || routeDeploying;
  const anyPackSuccess = packDeployLog.some((e) => e.success);
  const anyResourceSuccess = resourceDeployLog.some((e) => e.success);
  const anyRouteSuccess = routeDeployLog.some((e) => e.success);

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
    const fields = row.mapping.fields;
    const isExpanded = expandedRows.has(id);
    const canEdit = row.status === 'not_created' && !isDeploying;
    const summary = fieldSummary(fields, row.fieldValues);

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
              {summary && (
                <>
                  {' · '}
                  <span className="font-mono text-slate-500">{summary}</span>
                </>
              )}
            </p>
            {row.error && (
              <p className="text-[9px] font-medium text-red-500 mt-0.5">{row.error}</p>
            )}
          </div>
          <StatusBadge status={row.status} />
        </div>

        {isExpanded && (
          <div className="px-4 pb-3 pt-0 ml-[4.25rem]">
            <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
              <ConfigFieldsPanel
                fields={fields}
                values={row.fieldValues}
                disabled={!canEdit}
                onChange={(key, val) =>
                  isSource
                    ? updateSourceField(id, key, val)
                    : updateDestField(id, key, val)
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
                            Sources are created in a disabled state. Expand each row to configure required fields before deploying. Enable sources in the Cribl UI when ready. Required fields are marked with <span className="text-red-500 font-black">*</span>.
                          </p>
                        </div>
                      </div>
                    )}

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

            {/* ═══ Routes Tab ═══ */}
            {activeTab === 'routes' && (
              <div className="space-y-5 max-h-[45vh] overflow-y-auto custom-scrollbar pr-2">
                {!hasRoutes ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-500">No routes configured.</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Enable routing in Use Cases and define source-to-destination paths first.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                        Routes ({routeRows.length})
                      </h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRouteRows((prev) => prev.map((row) => row.status === 'not_created' ? { ...row, selected: true } : row))}
                          disabled={isDeploying}
                          className="text-[9px] font-black text-[#2596be] uppercase tracking-wider hover:underline disabled:opacity-50"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setRouteRows((prev) => prev.map((row) => row.status === 'not_created' ? { ...row, selected: false } : row))}
                          disabled={isDeploying}
                          className="text-[9px] font-black text-slate-400 uppercase tracking-wider hover:underline disabled:opacity-50"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {routeRows.map((row, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl border transition-colors ${
                            row.status === 'created'
                              ? 'bg-emerald-50 border-emerald-200'
                              : row.status === 'error'
                              ? 'bg-red-50 border-red-200'
                              : row.selected && row.status === 'not_created'
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 px-4 py-3">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              disabled={row.status !== 'not_created' || isDeploying}
                              onChange={() => toggleRoute(idx)}
                              className="w-4 h-4 rounded text-[#2596be] border-slate-300 disabled:opacity-40 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {/* Source */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                      <polyline points="7 10 12 15 17 10" />
                                      <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Source
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-800 truncate">{row.mapping.sourceLabel}</p>
                                  <p className="text-[8px] font-mono text-slate-400 truncate">{row.mapping.sourceInputId || '—'}</p>
                                </div>

                                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>

                                {/* Pack / Pipeline */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Pack
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-800 truncate">{row.mapping.packLabel}</p>
                                  <p className="text-[8px] font-mono text-slate-400 truncate">{row.mapping.pipelineId}</p>
                                </div>

                                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>

                                {/* Destination */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                      <polyline points="17 8 12 3 7 8" />
                                      <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    Destination
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-800 truncate">{row.mapping.destLabel}</p>
                                  <p className="text-[8px] font-mono text-slate-400 truncate">{row.mapping.destOutputId || '—'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                  row.mapping.routingEntry.fidelity === 'Full Fidelity'
                                    ? 'bg-violet-50 text-violet-600'
                                    : 'bg-teal-50 text-teal-600'
                                }`}>
                                  {row.mapping.routingEntry.fidelity}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                                  {row.mapping.routingEntry.format}
                                </span>
                              </div>
                              {row.error && (
                                <p className="text-[9px] font-medium text-red-500 mt-1">{row.error}</p>
                              )}
                            </div>
                            <StatusBadge status={row.status} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedRouteCount > 0 && !routeDeploying && (
                      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div>
                          <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider">
                            Routes Created as Disabled
                          </p>
                          <p className="text-[10px] text-blue-700 mt-0.5">
                            Routes are created in a disabled state and appended to the default route group.
                            Enable routes in the Cribl UI when ready. Verify pipeline assignments match your installed packs.
                          </p>
                        </div>
                      </div>
                    )}

                    {routeDeployLog.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-2 px-1">
                          Deployment Log
                        </h4>
                        <div className="space-y-1.5">
                          {routeDeployLog.map((entry, i) => (
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

                    {anyRouteSuccess && !routeDeploying && <CommitDeployReminder />}
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

          {activeTab === 'routes' && hasRoutes && selectedRouteCount > 0 && !isDeploying && isCriblCloud() && (
            <button
              onClick={() => setShowRouteConfirm(true)}
              className="flex-1 py-6 bg-[#2596be] text-white font-black uppercase tracking-widest rounded-3xl shadow-xl hover:bg-[#1a7696] transition-all active:scale-[0.98]"
            >
              Deploy {selectedRouteCount} Route{selectedRouteCount === 1 ? '' : 's'}
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
                (activeTab === 'sources-destinations' && hasResources && selectedResourceCount > 0) ||
                (activeTab === 'routes' && hasRoutes && selectedRouteCount > 0)
              )
                ? 'px-8 py-6 bg-slate-100 text-slate-500'
                : 'flex-1 py-6 bg-[#2596be] text-white hover:bg-[#1a7696]'
            } font-black uppercase tracking-widest rounded-3xl shadow-xl transition-all active:scale-[0.98]`}
          >
            {(anyPackSuccess || anyResourceSuccess || anyRouteSuccess) ? 'Done' : 'Close'}
          </button>
        </div>

        {/* Pack Confirmation Dialog */}
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

        {/* Route Confirmation Dialog */}
        {showRouteConfirm && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowRouteConfirm(false)}
          >
            <div
              className="bg-white p-8 rounded-[2rem] shadow-2xl border border-blue-100 max-w-md w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-blue-50 text-[#2596be] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h4 className="font-black text-slate-900 uppercase mb-2">Create Routes?</h4>
              <p className="text-xs text-slate-500 mb-2">
                This will create {selectedRouteCount} route{selectedRouteCount === 1 ? '' : 's'} in
                worker group <strong>{selectedGroup}</strong>.
              </p>
              <div className="text-left bg-slate-50 rounded-xl p-3 mb-6 max-h-48 overflow-y-auto">
                {routeRows
                  .filter((r) => r.selected && r.status === 'not_created')
                  .map((r, i) => (
                    <div key={i} className="py-1 border-b border-slate-100 last:border-0">
                      <p className="text-[10px] font-bold text-slate-600">
                        {r.mapping.sourceLabel}
                        <span className="text-slate-400 mx-1">→</span>
                        {r.mapping.packLabel}
                        <span className="text-slate-400 mx-1">→</span>
                        {r.mapping.destLabel}
                      </p>
                    </div>
                  ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDeployRoutes}
                  className="flex-1 py-3 bg-[#2596be] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#1a7696] transition-all"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowRouteConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resource Confirmation Dialog */}
        {showResourceConfirm && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowResourceConfirm(false)}
          >
            <div
              className="bg-white p-8 rounded-[2rem] shadow-2xl border border-blue-100 max-w-md w-full text-center"
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
              <div className="text-left bg-slate-50 rounded-xl p-3 mb-6 max-h-48 overflow-y-auto">
                {selectedSourceCount > 0 && (
                  <>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Sources</p>
                    {sourceRows
                      .filter((r) => r.selected && r.status === 'not_created')
                      .map((r) => {
                        const summary = fieldSummary(r.mapping.fields, r.fieldValues);
                        return (
                          <p key={r.mapping.suggestedId} className="text-[10px] font-bold text-slate-600 py-0.5 pl-2">
                            • {r.mapping.povSource.dataType} ({r.mapping.criblLabel})
                            {summary && <span className="text-slate-400 ml-1">— {summary}</span>}
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
                        const summary = fieldSummary(r.mapping.fields, r.fieldValues);
                        return (
                          <p key={r.mapping.suggestedId} className="text-[10px] font-bold text-slate-600 py-0.5 pl-2">
                            • {r.mapping.povDestination.siemSoa} ({r.mapping.criblLabel})
                            {summary && <span className="text-slate-400 ml-1">— {summary}</span>}
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
