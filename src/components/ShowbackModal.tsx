import React, { useState, useMemo } from 'react';
import type {
  ShowbackData,
  ShowbackArchEntry,
  ShowbackArchStatus,
  ShowbackDataFlowEntry,
  ShowbackFlowStatus,
  ShowbackOptEntry,
  PovSource,
  PovDestination,
} from '../types';

const ARCH_STATUSES: ShowbackArchStatus[] = ['Deployed', 'Configured', 'Tested', 'Production'];
const FLOW_STATUSES: ShowbackFlowStatus[] = ['Active', 'Configured', 'Tested'];

const ARCH_COMPONENTS = [
  'Cribl Stream (Cloud)',
  'Cribl Stream (Hybrid)',
  'Cribl Edge (Linux)',
  'Cribl Edge (Windows)',
  'Cribl Search',
  'Cribl Lake',
  'Cribl Lakehouse',
];

export const EMPTY_SHOWBACK_DATA: ShowbackData = {
  architecture: { notes: '', image: null, entries: [] },
  dataFlows: { entries: [] },
  optimization: { entries: [] },
};

const EMPTY_ARCH_ENTRY: ShowbackArchEntry = {
  component: '',
  description: '',
  status: 'Configured',
};

const EMPTY_FLOW_ENTRY: ShowbackDataFlowEntry = {
  dataType: '',
  source: '',
  destination: '',
  gbPerDayIn: '',
  gbPerDayOut: '',
  status: 'Configured',
};

const EMPTY_OPT_ENTRY: ShowbackOptEntry = {
  dataType: '',
  gbPerDayBefore: '',
  gbPerDayAfter: '',
  reductionPercent: '',
  notes: '',
};

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-[#2596be] pb-2 mt-4 mb-2 first:mt-0">
      {title}
    </h4>
  );
}

type ShowbackTab = 'architecture' | 'dataFlows' | 'optimization';

export interface ShowbackModalProps {
  data: ShowbackData;
  povSources: PovSource[];
  povDestinations: PovDestination[];
  onChange: (data: ShowbackData) => void;
  onClose: () => void;
}

export function showbackSummary(data: ShowbackData): string {
  const parts: string[] = [];
  if (data.architecture.entries.length > 0) {
    parts.push(`${data.architecture.entries.length} component${data.architecture.entries.length === 1 ? '' : 's'}`);
  }
  if (data.dataFlows.entries.length > 0) {
    parts.push(`${data.dataFlows.entries.length} flow${data.dataFlows.entries.length === 1 ? '' : 's'}`);
  }
  if (data.optimization.entries.length > 0) {
    parts.push(`${data.optimization.entries.length} optimization${data.optimization.entries.length === 1 ? '' : 's'}`);
  }
  return parts.length > 0 ? parts.join(', ') : 'Capture POC results...';
}

export function mergeShowbackData(value: unknown): ShowbackData {
  if (!value || typeof value !== 'object') return structuredClone(EMPTY_SHOWBACK_DATA);
  const input = value as Partial<ShowbackData>;
  return {
    architecture: {
      notes: typeof input.architecture?.notes === 'string' ? input.architecture.notes : '',
      image: typeof input.architecture?.image === 'string' ? input.architecture.image : null,
      entries: Array.isArray(input.architecture?.entries) ? input.architecture.entries : [],
    },
    dataFlows: {
      entries: Array.isArray(input.dataFlows?.entries) ? input.dataFlows.entries : [],
    },
    optimization: {
      entries: Array.isArray(input.optimization?.entries) ? input.optimization.entries : [],
    },
  };
}

function ArchitectureTab({
  data,
  onChange,
}: {
  data: ShowbackData;
  onChange: (data: ShowbackData) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [temp, setTemp] = useState<ShowbackArchEntry>({ ...EMPTY_ARCH_ENTRY });

  const resetForm = () => {
    setEditingIndex(null);
    setTemp({ ...EMPTY_ARCH_ENTRY });
  };

  const saveEntry = () => {
    if (!temp.component.trim()) return;
    const entry = { ...temp, component: temp.component.trim(), description: temp.description.trim() };
    const entries = editingIndex !== null
      ? data.architecture.entries.map((e, i) => (i === editingIndex ? entry : e))
      : [...data.architecture.entries, entry];
    onChange({ ...data, architecture: { ...data.architecture, entries } });
    resetForm();
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Component</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Description</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Status</th>
              <th className="p-2 w-16" />
            </tr>
          </thead>
          <tbody>
            {data.architecture.entries.length > 0 ? data.architecture.entries.map((entry, index) => (
              <tr key={index} className="group border-t border-slate-100">
                <td className="p-2 font-medium text-slate-700">{entry.component}</td>
                <td className="p-2 font-medium text-slate-700">{entry.description || '-'}</td>
                <td className="p-2 font-medium text-slate-700">{entry.status}</td>
                <td className="p-2">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                    <button type="button" onClick={() => { setEditingIndex(index); setTemp({ ...entry }); }} className="p-1 hover:text-[#2596be] text-slate-400 transition-colors cursor-pointer" title="Edit">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button type="button" onClick={() => { onChange({ ...data, architecture: { ...data.architecture, entries: data.architecture.entries.filter((_, i) => i !== index) } }); if (editingIndex === index) resetForm(); }} className="p-1 hover:text-red-500 text-slate-400 transition-colors cursor-pointer" title="Delete">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">No components added</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <SectionHeader title={editingIndex !== null ? 'Edit Component' : 'Add Component'} />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Component</label>
          <input
            type="text"
            list="showback-arch-components"
            className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs"
            value={temp.component}
            placeholder="Select or type..."
            onChange={(e) => setTemp({ ...temp, component: e.target.value })}
          />
          <datalist id="showback-arch-components">
            {ARCH_COMPONENTS.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Description</label>
          <input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs" value={temp.description} placeholder="What was deployed..." onChange={(e) => setTemp({ ...temp, description: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Status</label>
          <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold" value={temp.status} onChange={(e) => setTemp({ ...temp, status: e.target.value as ShowbackArchStatus })}>
            {ARCH_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={saveEntry} className="flex-1 py-3 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-colors">
          {editingIndex !== null ? 'Update Component' : 'Add Component'}
        </button>
        {editingIndex !== null && (
          <button type="button" onClick={resetForm} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
        )}
      </div>

      <SectionHeader title="Architecture Notes" />
      <textarea
        rows={3}
        className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs resize-none outline-none focus:ring-2 focus:ring-[#2596be] placeholder:text-slate-400"
        value={data.architecture.notes}
        placeholder="Describe the architecture deployed during the POC..."
        onChange={(e) => onChange({ ...data, architecture: { ...data.architecture, notes: e.target.value } })}
      />

      <SectionHeader title="Architecture Diagram" />
      <div className="flex items-center gap-3">
        <label className="flex-1 text-center px-4 py-3 bg-white border border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-[#2596be] hover:text-[#2596be] cursor-pointer transition-all shadow-sm">
          {data.architecture.image ? 'Update Image' : 'Upload Image'}
          <input type="file" className="hidden" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const r = new FileReader();
              r.onload = (ev) => onChange({ ...data, architecture: { ...data.architecture, image: ev.target?.result as string } });
              r.readAsDataURL(file);
            }
          }} />
        </label>
        {data.architecture.image && (
          <button type="button" onClick={() => onChange({ ...data, architecture: { ...data.architecture, image: null } })} className="text-[9px] font-bold text-red-500 uppercase hover:underline">Remove</button>
        )}
      </div>
      {data.architecture.image && (
        <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
          <img src={data.architecture.image} alt="Architecture" className="max-h-32 object-contain mx-auto" />
        </div>
      )}
    </div>
  );
}

function DataFlowsTab({
  data,
  povSources,
  povDestinations,
  onChange,
}: {
  data: ShowbackData;
  povSources: PovSource[];
  povDestinations: PovDestination[];
  onChange: (data: ShowbackData) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [temp, setTemp] = useState<ShowbackDataFlowEntry>({ ...EMPTY_FLOW_ENTRY });

  const resetForm = () => {
    setEditingIndex(null);
    setTemp({ ...EMPTY_FLOW_ENTRY });
  };

  const saveEntry = () => {
    if (!temp.dataType.trim() || !temp.source.trim() || !temp.destination.trim()) return;
    const entry = { ...temp, dataType: temp.dataType.trim(), source: temp.source.trim(), destination: temp.destination.trim() };
    const entries = editingIndex !== null
      ? data.dataFlows.entries.map((e, i) => (i === editingIndex ? entry : e))
      : [...data.dataFlows.entries, entry];
    onChange({ ...data, dataFlows: { entries } });
    resetForm();
  };

  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    povSources.forEach((s) => { if (s.source) set.add(s.source); });
    return Array.from(set);
  }, [povSources]);

  const destOptions = useMemo(() => {
    const set = new Set<string>();
    povDestinations.forEach((d) => { if (d.destination) set.add(d.destination); });
    return Array.from(set);
  }, [povDestinations]);

  const dataTypeOptions = useMemo(() => {
    const set = new Set<string>();
    povSources.forEach((s) => { if (s.dataType) set.add(s.dataType); });
    return Array.from(set);
  }, [povSources]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Data Type</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Source</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Destination</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">GB/Day In</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">GB/Day Out</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Status</th>
              <th className="p-2 w-16" />
            </tr>
          </thead>
          <tbody>
            {data.dataFlows.entries.length > 0 ? data.dataFlows.entries.map((entry, index) => (
              <tr key={index} className="group border-t border-slate-100">
                <td className="p-2 font-medium text-slate-700">{entry.dataType}</td>
                <td className="p-2 font-medium text-slate-700">{entry.source}</td>
                <td className="p-2 font-medium text-slate-700">{entry.destination}</td>
                <td className="p-2 font-medium text-slate-700">{entry.gbPerDayIn || '-'}</td>
                <td className="p-2 font-medium text-slate-700">{entry.gbPerDayOut || '-'}</td>
                <td className="p-2 font-medium text-slate-700">{entry.status}</td>
                <td className="p-2">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                    <button type="button" onClick={() => { setEditingIndex(index); setTemp({ ...entry }); }} className="p-1 hover:text-[#2596be] text-slate-400 transition-colors cursor-pointer" title="Edit">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button type="button" onClick={() => { onChange({ ...data, dataFlows: { entries: data.dataFlows.entries.filter((_, i) => i !== index) } }); if (editingIndex === index) resetForm(); }} className="p-1 hover:text-red-500 text-slate-400 transition-colors cursor-pointer" title="Delete">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">No data flows added</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <SectionHeader title={editingIndex !== null ? 'Edit Data Flow' : 'Add Data Flow'} />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Data Type</label>
          <input type="text" list="showback-flow-datatypes" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs" value={temp.dataType} placeholder="e.g. PAN Firewall" onChange={(e) => setTemp({ ...temp, dataType: e.target.value })} />
          <datalist id="showback-flow-datatypes">
            {dataTypeOptions.map((dt) => <option key={dt} value={dt} />)}
          </datalist>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Source</label>
          <input type="text" list="showback-flow-sources" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs" value={temp.source} placeholder="e.g. Syslog" onChange={(e) => setTemp({ ...temp, source: e.target.value })} />
          <datalist id="showback-flow-sources">
            {sourceOptions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Destination</label>
          <input type="text" list="showback-flow-dests" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs" value={temp.destination} placeholder="e.g. Splunk HEC" onChange={(e) => setTemp({ ...temp, destination: e.target.value })} />
          <datalist id="showback-flow-dests">
            {destOptions.map((d) => <option key={d} value={d} />)}
          </datalist>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">GB/Day In</label>
          <input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs" value={temp.gbPerDayIn} placeholder="e.g. 50" onChange={(e) => setTemp({ ...temp, gbPerDayIn: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">GB/Day Out</label>
          <input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs" value={temp.gbPerDayOut} placeholder="e.g. 25" onChange={(e) => setTemp({ ...temp, gbPerDayOut: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Status</label>
          <select className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold" value={temp.status} onChange={(e) => setTemp({ ...temp, status: e.target.value as ShowbackFlowStatus })}>
            {FLOW_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={saveEntry} className="flex-1 py-3 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-colors">
          {editingIndex !== null ? 'Update Data Flow' : 'Add Data Flow'}
        </button>
        {editingIndex !== null && (
          <button type="button" onClick={resetForm} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
        )}
      </div>
    </div>
  );
}

function OptimizationTab({
  data,
  povSources,
  onChange,
}: {
  data: ShowbackData;
  povSources: PovSource[];
  onChange: (data: ShowbackData) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [temp, setTemp] = useState<ShowbackOptEntry>({ ...EMPTY_OPT_ENTRY });

  const resetForm = () => {
    setEditingIndex(null);
    setTemp({ ...EMPTY_OPT_ENTRY });
  };

  const autoCalcReduction = (before: string, after: string): string => {
    const b = parseFloat(before);
    const a = parseFloat(after);
    if (isNaN(b) || isNaN(a) || b === 0) return '';
    return Math.round(((b - a) / b) * 100).toString();
  };

  const handleBeforeChange = (val: string) => {
    const updated = { ...temp, gbPerDayBefore: val };
    if (temp.gbPerDayAfter) updated.reductionPercent = autoCalcReduction(val, temp.gbPerDayAfter);
    setTemp(updated);
  };

  const handleAfterChange = (val: string) => {
    const updated = { ...temp, gbPerDayAfter: val };
    if (temp.gbPerDayBefore) updated.reductionPercent = autoCalcReduction(temp.gbPerDayBefore, val);
    setTemp(updated);
  };

  const saveEntry = () => {
    if (!temp.dataType.trim()) return;
    const entry = { ...temp, dataType: temp.dataType.trim(), notes: temp.notes.trim() };
    const entries = editingIndex !== null
      ? data.optimization.entries.map((e, i) => (i === editingIndex ? entry : e))
      : [...data.optimization.entries, entry];
    onChange({ ...data, optimization: { entries } });
    resetForm();
  };

  const totals = useMemo(() => {
    let totalBefore = 0;
    let totalAfter = 0;
    data.optimization.entries.forEach((e) => {
      const b = parseFloat(e.gbPerDayBefore);
      const a = parseFloat(e.gbPerDayAfter);
      if (!isNaN(b)) totalBefore += b;
      if (!isNaN(a)) totalAfter += a;
    });
    const reduction = totalBefore > 0 ? Math.round(((totalBefore - totalAfter) / totalBefore) * 100) : 0;
    return { totalBefore, totalAfter, reduction };
  }, [data.optimization.entries]);

  const dataTypeOptions = useMemo(() => {
    const set = new Set<string>();
    povSources.forEach((s) => { if (s.dataType) set.add(s.dataType); });
    return Array.from(set);
  }, [povSources]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Data Type</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">GB/Day Before</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">GB/Day After</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Reduction %</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Notes</th>
              <th className="p-2 w-16" />
            </tr>
          </thead>
          <tbody>
            {data.optimization.entries.length > 0 ? (
              <>
                {data.optimization.entries.map((entry, index) => (
                  <tr key={index} className="group border-t border-slate-100">
                    <td className="p-2 font-medium text-slate-700">{entry.dataType}</td>
                    <td className="p-2 font-medium text-slate-700">{entry.gbPerDayBefore || '-'}</td>
                    <td className="p-2 font-medium text-slate-700">{entry.gbPerDayAfter || '-'}</td>
                    <td className="p-2 font-bold text-emerald-600">{entry.reductionPercent ? `${entry.reductionPercent}%` : '-'}</td>
                    <td className="p-2 font-medium text-slate-500">{entry.notes || '-'}</td>
                    <td className="p-2">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                        <button type="button" onClick={() => { setEditingIndex(index); setTemp({ ...entry }); }} className="p-1 hover:text-[#2596be] text-slate-400 transition-colors cursor-pointer" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button type="button" onClick={() => { onChange({ ...data, optimization: { entries: data.optimization.entries.filter((_, i) => i !== index) } }); if (editingIndex === index) resetForm(); }} className="p-1 hover:text-red-500 text-slate-400 transition-colors cursor-pointer" title="Delete">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.optimization.entries.length > 1 && (
                  <tr className="border-t-2 border-slate-300 bg-slate-50">
                    <td className="p-2 font-black text-slate-900 uppercase text-[9px]">Total</td>
                    <td className="p-2 font-bold text-slate-900">{totals.totalBefore > 0 ? totals.totalBefore.toFixed(1) : '-'}</td>
                    <td className="p-2 font-bold text-slate-900">{totals.totalAfter > 0 ? totals.totalAfter.toFixed(1) : '-'}</td>
                    <td className="p-2 font-black text-emerald-600">{totals.reduction > 0 ? `${totals.reduction}%` : '-'}</td>
                    <td colSpan={2} />
                  </tr>
                )}
              </>
            ) : (
              <tr><td colSpan={6} className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">No optimization results added</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <SectionHeader title={editingIndex !== null ? 'Edit Optimization Result' : 'Add Optimization Result'} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Data Type</label>
          <input type="text" list="showback-opt-datatypes" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs" value={temp.dataType} placeholder="e.g. PAN Firewall" onChange={(e) => setTemp({ ...temp, dataType: e.target.value })} />
          <datalist id="showback-opt-datatypes">
            {dataTypeOptions.map((dt) => <option key={dt} value={dt} />)}
          </datalist>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Notes</label>
          <input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs" value={temp.notes} placeholder="e.g. Removed null fields" onChange={(e) => setTemp({ ...temp, notes: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">GB/Day Before</label>
          <input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs" value={temp.gbPerDayBefore} placeholder="e.g. 100" onChange={(e) => handleBeforeChange(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">GB/Day After</label>
          <input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs" value={temp.gbPerDayAfter} placeholder="e.g. 40" onChange={(e) => handleAfterChange(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Reduction %</label>
          <input type="text" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold text-emerald-600" value={temp.reductionPercent} placeholder="Auto-calculated" onChange={(e) => setTemp({ ...temp, reductionPercent: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={saveEntry} className="flex-1 py-3 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-colors">
          {editingIndex !== null ? 'Update Result' : 'Add Result'}
        </button>
        {editingIndex !== null && (
          <button type="button" onClick={resetForm} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
        )}
      </div>
    </div>
  );
}

export function ShowbackModal({ data, povSources, povDestinations, onChange, onClose }: ShowbackModalProps) {
  const [activeTab, setActiveTab] = useState<ShowbackTab>('architecture');

  const tabs: { key: ShowbackTab; label: string }[] = [
    { key: 'architecture', label: 'Architecture' },
    { key: 'dataFlows', label: 'Data Flows' },
    { key: 'optimization', label: 'Optimization' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] p-10 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-3xl font-black uppercase text-slate-900">POC Showback</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capture POC Results</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-400">✕</button>
        </div>

        <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-[#2596be] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-[55vh] overflow-y-auto custom-scrollbar pr-2">
          {activeTab === 'architecture' && <ArchitectureTab data={data} onChange={onChange} />}
          {activeTab === 'dataFlows' && <DataFlowsTab data={data} povSources={povSources} povDestinations={povDestinations} onChange={onChange} />}
          {activeTab === 'optimization' && <OptimizationTab data={data} povSources={povSources} onChange={onChange} />}
        </div>

        <button type="button" onClick={onClose} className="w-full py-6 bg-[#2596be] text-white font-black uppercase tracking-widest rounded-3xl mt-8 shadow-xl hover:bg-[#1a7696] transition-all active:scale-[0.98]">
          Save Showback
        </button>
      </div>
    </div>
  );
}

const docHeaderCellStyle: React.CSSProperties = {
  color: '#fff',
  padding: '8pt',
  fontSize: '9pt',
  textAlign: 'left',
};

const docCellStyle: React.CSSProperties = {
  border: '1pt solid #cbd5e1',
  padding: '8pt',
  fontSize: '9pt',
};

const categoryHeaderStyle: React.CSSProperties = {
  fontSize: '18pt',
  fontWeight: 900,
  color: '#2596be',
  margin: '18pt 0 12pt 0',
  borderBottom: '2pt solid #2596be',
  paddingBottom: '4pt',
  textTransform: 'uppercase',
};

const subHeaderStyle: React.CSSProperties = {
  fontSize: '14pt',
  fontWeight: 900,
  color: '#0f172a',
  margin: '24pt 0 12pt 0',
  borderBottom: '1pt solid #2596be',
  paddingBottom: '4pt',
};

export function ShowbackDocumentSection({ data }: { data: ShowbackData }) {
  const hasArch = data.architecture.entries.length > 0 || data.architecture.notes || data.architecture.image;
  const hasFlows = data.dataFlows.entries.length > 0;
  const hasOpt = data.optimization.entries.length > 0;

  if (!hasArch && !hasFlows && !hasOpt) return null;

  const optTotals = (() => {
    let totalBefore = 0;
    let totalAfter = 0;
    data.optimization.entries.forEach((e) => {
      const b = parseFloat(e.gbPerDayBefore);
      const a = parseFloat(e.gbPerDayAfter);
      if (!isNaN(b)) totalBefore += b;
      if (!isNaN(a)) totalAfter += a;
    });
    const reduction = totalBefore > 0 ? Math.round(((totalBefore - totalAfter) / totalBefore) * 100) : 0;
    return { totalBefore, totalAfter, reduction };
  })();

  return (
    <div className="space-y-8 break-inside-avoid">
      <h2 style={categoryHeaderStyle}>POC SHOWBACK</h2>

      {hasArch && (
        <div className="space-y-4">
          <h3 style={subHeaderStyle}>Architecture</h3>
          {data.architecture.entries.length > 0 && (
            <table style={{ width: '100%', border: '1pt solid #cbd5e1', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#0f172a' }}>
                <tr>
                  <th style={docHeaderCellStyle}>Component</th>
                  <th style={docHeaderCellStyle}>Description</th>
                  <th style={{ ...docHeaderCellStyle, width: '15%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.architecture.entries.map((entry, index) => (
                  <tr key={index}>
                    <td style={{ ...docCellStyle, fontWeight: 'bold' }}>{entry.component}</td>
                    <td style={docCellStyle}>{entry.description || '-'}</td>
                    <td style={docCellStyle}>{entry.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data.architecture.notes && (
            <p style={{ fontSize: '10pt', margin: '8pt 0', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{data.architecture.notes}</p>
          )}
          {data.architecture.image && (
            <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
              <img
                src={data.architecture.image}
                alt="POC Architecture"
                style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', display: 'inline-block' }}
              />
            </div>
          )}
        </div>
      )}

      {hasFlows && (
        <div className="space-y-4">
          <h3 style={subHeaderStyle}>Data Flows</h3>
          <table style={{ width: '100%', border: '1pt solid #cbd5e1', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#0f172a' }}>
              <tr>
                <th style={docHeaderCellStyle}>Data Type</th>
                <th style={docHeaderCellStyle}>Source</th>
                <th style={docHeaderCellStyle}>Destination</th>
                <th style={docHeaderCellStyle}>GB/Day In</th>
                <th style={docHeaderCellStyle}>GB/Day Out</th>
                <th style={docHeaderCellStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.dataFlows.entries.map((entry, index) => (
                <tr key={index}>
                  <td style={docCellStyle}>{entry.dataType}</td>
                  <td style={docCellStyle}>{entry.source}</td>
                  <td style={docCellStyle}>{entry.destination}</td>
                  <td style={docCellStyle}>{entry.gbPerDayIn || '-'}</td>
                  <td style={docCellStyle}>{entry.gbPerDayOut || '-'}</td>
                  <td style={docCellStyle}>{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasOpt && (
        <div className="space-y-4">
          <h3 style={subHeaderStyle}>Optimization Results</h3>
          <table style={{ width: '100%', border: '1pt solid #cbd5e1', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#0f172a' }}>
              <tr>
                <th style={docHeaderCellStyle}>Data Type</th>
                <th style={docHeaderCellStyle}>GB/Day Before</th>
                <th style={docHeaderCellStyle}>GB/Day After</th>
                <th style={docHeaderCellStyle}>Reduction</th>
                <th style={docHeaderCellStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.optimization.entries.map((entry, index) => (
                <tr key={index}>
                  <td style={docCellStyle}>{entry.dataType}</td>
                  <td style={docCellStyle}>{entry.gbPerDayBefore || '-'}</td>
                  <td style={docCellStyle}>{entry.gbPerDayAfter || '-'}</td>
                  <td style={{ ...docCellStyle, fontWeight: 'bold', color: '#059669' }}>{entry.reductionPercent ? `${entry.reductionPercent}%` : '-'}</td>
                  <td style={docCellStyle}>{entry.notes || '-'}</td>
                </tr>
              ))}
              {data.optimization.entries.length > 1 && (
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td style={{ ...docCellStyle, fontWeight: 900, textTransform: 'uppercase', fontSize: '8pt' }}>Total</td>
                  <td style={{ ...docCellStyle, fontWeight: 'bold' }}>{optTotals.totalBefore > 0 ? optTotals.totalBefore.toFixed(1) : '-'}</td>
                  <td style={{ ...docCellStyle, fontWeight: 'bold' }}>{optTotals.totalAfter > 0 ? optTotals.totalAfter.toFixed(1) : '-'}</td>
                  <td style={{ ...docCellStyle, fontWeight: 900, color: '#059669', fontSize: '11pt' }}>{optTotals.reduction > 0 ? `${optTotals.reduction}%` : '-'}</td>
                  <td style={docCellStyle} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
