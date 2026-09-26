import React, { useState } from 'react';
import type { EnrichmentEntry, OptimizationEntry, PovDestination, PovSource, PovUseCases, RoutingEntry, TransformationEntry } from '../types';
import { POV_DATA_TYPE_SUGGESTIONS } from '../constants';
import {
  EMPTY_POV_USE_CASES,
  EMPTY_ENRICHMENT_ENTRY,
  EMPTY_OPTIMIZATION_ENTRY,
  EMPTY_ROUTING_ENTRY,
  EMPTY_TRANSFORMATION_ENTRY,
  ROUTING_FIDELITIES,
  ROUTING_FORMATS,
  SEARCH_ANALYZE_OPTIONS,
  TRANSFORMATION_FORMATS,
  countEnabledUseCases,
  mergePovUseCases,
} from '../useCases/constants';
import type { RoutingFormat } from '../types';
import {
  formatDestinationLabel,
  formatSourceLabel,
  povDestinationKey,
  povSourceKey,
  resolveDestinationLabel,
  resolveSourceLabel,
  toggleKey,
} from '../useCases/keys';

const bodyStyle: React.CSSProperties = {
  fontSize: '10pt',
  margin: '4pt 0',
  color: '#1e293b',
};

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-[#2596be] pb-2 mt-2 mb-2 first:mt-0">
      {title}
    </h4>
  );
}

function formatRoutingFormatLabel(format: RoutingFormat, formatOther: string): string {
  return format === 'Other' && formatOther.trim() ? formatOther.trim() : format;
}

interface RoutingSectionProps {
  routing: PovUseCases['routing'];
  povSources: PovSource[];
  povDestinations: PovDestination[];
  canAddRoutingEntry: boolean;
  onChange: (routing: PovUseCases['routing']) => void;
}

function RoutingSection({ routing, povSources, povDestinations, canAddRoutingEntry, onChange }: RoutingSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempRoute, setTempRoute] = useState<RoutingEntry>({ ...EMPTY_ROUTING_ENTRY });

  const resetForm = () => {
    setEditingIndex(null);
    setTempRoute({ ...EMPTY_ROUTING_ENTRY });
  };

  const saveRoute = () => {
    if (!tempRoute.sourceKey || !tempRoute.destinationKey) return;
    if (editingIndex !== null) {
      onChange({
        ...routing,
        entries: routing.entries.map((entry, i) => (i === editingIndex ? { ...tempRoute } : entry)),
      });
    } else {
      onChange({
        ...routing,
        entries: [...routing.entries, { ...tempRoute }],
      });
    }
    resetForm();
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Source</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Fidelity</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Destination</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Format</th>
              <th className="p-2 w-16" />
            </tr>
          </thead>
          <tbody>
            {routing.entries.length > 0 ? routing.entries.map((entry, index) => (
              <tr key={index} className="group border-t border-slate-100">
                <td className="p-2 font-medium text-slate-700">{resolveSourceLabel(povSources, entry.sourceKey) || '-'}</td>
                <td className="p-2 font-medium text-slate-700">{entry.fidelity}</td>
                <td className="p-2 font-medium text-slate-700">{resolveDestinationLabel(povDestinations, entry.destinationKey) || '-'}</td>
                <td className="p-2 font-medium text-slate-700">{formatRoutingFormatLabel(entry.format, entry.formatOther)}</td>
                <td className="p-2">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(index);
                        setTempRoute({ ...entry });
                      }}
                      className="p-1 hover:text-[#2596be] text-slate-400 transition-colors cursor-pointer"
                      title="Edit Route"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          ...routing,
                          entries: routing.entries.filter((_, i) => i !== index),
                        });
                        if (editingIndex === index) resetForm();
                      }}
                      className="p-1 hover:text-red-500 text-slate-400 transition-colors cursor-pointer"
                      title="Delete Route"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  No routes added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!canAddRoutingEntry ? (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Add sources and destinations in POV Sources and Destinations first
        </p>
      ) : (
        <>
          <SectionHeader title={editingIndex !== null ? 'Edit Route' : 'Add Route'} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Source</label>
              <SourceSelect
                sources={povSources}
                value={tempRoute.sourceKey}
                onChange={(sourceKey) => setTempRoute({ ...tempRoute, sourceKey })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Fidelity</label>
              <select
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold"
                value={tempRoute.fidelity}
                onChange={(e) => setTempRoute({ ...tempRoute, fidelity: e.target.value as RoutingEntry['fidelity'] })}
              >
                {ROUTING_FIDELITIES.map((fidelity) => (
                  <option key={fidelity} value={fidelity}>{fidelity}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Destination</label>
              <DestinationSelect
                destinations={povDestinations}
                value={tempRoute.destinationKey}
                onChange={(destinationKey) => setTempRoute({ ...tempRoute, destinationKey })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Format</label>
              <select
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold"
                value={tempRoute.format}
                onChange={(e) => setTempRoute({ ...tempRoute, format: e.target.value as RoutingFormat })}
              >
                {ROUTING_FORMATS.map((format) => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </div>
          </div>
          {tempRoute.format === 'Other' && (
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Other Format</label>
              <input
                type="text"
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs"
                value={tempRoute.formatOther}
                placeholder="Describe format..."
                onChange={(e) => setTempRoute({ ...tempRoute, formatOther: e.target.value })}
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveRoute}
              className="flex-1 py-3 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-colors"
            >
              {editingIndex !== null ? 'Update Route' : 'Add Route'}
            </button>
            {editingIndex !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function formatOptimizationPercent(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '-';
  return trimmed.endsWith('%') ? trimmed : `${trimmed}%`;
}

interface OptimizationSectionProps {
  optimization: PovUseCases['optimization'];
  povSources: PovSource[];
  canAddEntry: boolean;
  onChange: (optimization: PovUseCases['optimization']) => void;
}

function OptimizationSection({ optimization, povSources, canAddEntry, onChange }: OptimizationSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempEntry, setTempEntry] = useState<OptimizationEntry>({ ...EMPTY_OPTIMIZATION_ENTRY });

  const resetForm = () => {
    setEditingIndex(null);
    setTempEntry({ ...EMPTY_OPTIMIZATION_ENTRY });
  };

  const saveEntry = () => {
    if (!tempEntry.sourceKey || !tempEntry.optimizationPercent.trim()) return;
    if (editingIndex !== null) {
      onChange({
        ...optimization,
        entries: optimization.entries.map((entry, i) => (i === editingIndex ? { ...tempEntry } : entry)),
      });
    } else {
      onChange({
        ...optimization,
        entries: [...optimization.entries, { ...tempEntry }],
      });
    }
    resetForm();
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Source</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Expected %</th>
              <th className="p-2 w-16" />
            </tr>
          </thead>
          <tbody>
            {optimization.entries.length > 0 ? optimization.entries.map((entry, index) => (
              <tr key={index} className="group border-t border-slate-100">
                <td className="p-2 font-medium text-slate-700">{resolveSourceLabel(povSources, entry.sourceKey) || '-'}</td>
                <td className="p-2 font-medium text-slate-700">{formatOptimizationPercent(entry.optimizationPercent)}</td>
                <td className="p-2">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(index);
                        setTempEntry({ ...entry });
                      }}
                      className="p-1 hover:text-[#2596be] text-slate-400 transition-colors cursor-pointer"
                      title="Edit Optimization"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          ...optimization,
                          entries: optimization.entries.filter((_, i) => i !== index),
                        });
                        if (editingIndex === index) resetForm();
                      }}
                      className="p-1 hover:text-red-500 text-slate-400 transition-colors cursor-pointer"
                      title="Delete Optimization"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  No optimizations added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!canAddEntry ? (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Add sources in POV Sources and Destinations first
        </p>
      ) : (
        <>
          <SectionHeader title={editingIndex !== null ? 'Edit Optimization' : 'Add Optimization'} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Source</label>
              <SourceSelect
                sources={povSources}
                value={tempEntry.sourceKey}
                onChange={(sourceKey) => setTempEntry({ ...tempEntry, sourceKey })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Expected %</label>
              <input
                type="text"
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold"
                value={tempEntry.optimizationPercent}
                placeholder="e.g. 40"
                onChange={(e) => setTempEntry({ ...tempEntry, optimizationPercent: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveEntry}
              className="flex-1 py-3 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-colors"
            >
              {editingIndex !== null ? 'Update Optimization' : 'Add Optimization'}
            </button>
            {editingIndex !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface TransformationSectionProps {
  transformation: PovUseCases['transformation'];
  onChange: (transformation: PovUseCases['transformation']) => void;
}

function TransformationSection({ transformation, onChange }: TransformationSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempEntry, setTempEntry] = useState<TransformationEntry>({ ...EMPTY_TRANSFORMATION_ENTRY });

  const resetForm = () => {
    setEditingIndex(null);
    setTempEntry({ ...EMPTY_TRANSFORMATION_ENTRY });
  };

  const saveEntry = () => {
    if (!tempEntry.dataType.trim() || !tempEntry.format.trim()) return;
    const entry = {
      dataType: tempEntry.dataType.trim(),
      format: tempEntry.format.trim(),
    };
    if (editingIndex !== null) {
      onChange({
        ...transformation,
        entries: transformation.entries.map((item, i) => (i === editingIndex ? entry : item)),
      });
    } else {
      onChange({
        ...transformation,
        entries: [...transformation.entries, entry],
      });
    }
    resetForm();
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Data Type</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Format</th>
              <th className="p-2 w-16" />
            </tr>
          </thead>
          <tbody>
            {transformation.entries.length > 0 ? transformation.entries.map((entry, index) => (
              <tr key={index} className="group border-t border-slate-100">
                <td className="p-2 font-medium text-slate-700">{entry.dataType || '-'}</td>
                <td className="p-2 font-medium text-slate-700">{entry.format || '-'}</td>
                <td className="p-2">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(index);
                        setTempEntry({ ...entry });
                      }}
                      className="p-1 hover:text-[#2596be] text-slate-400 transition-colors cursor-pointer"
                      title="Edit Transformation"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          ...transformation,
                          entries: transformation.entries.filter((_, i) => i !== index),
                        });
                        if (editingIndex === index) resetForm();
                      }}
                      className="p-1 hover:text-red-500 text-slate-400 transition-colors cursor-pointer"
                      title="Delete Transformation"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  No transformations added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SectionHeader title={editingIndex !== null ? 'Edit Transformation' : 'Add Transformation'} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Data Type</label>
          <input
            type="text"
            list="transformation-data-type-suggestions"
            className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold"
            value={tempEntry.dataType}
            placeholder="Select or type a data type..."
            onChange={(e) => setTempEntry({ ...tempEntry, dataType: e.target.value })}
          />
          <datalist id="transformation-data-type-suggestions">
            {POV_DATA_TYPE_SUGGESTIONS.map((dataType) => (
              <option key={dataType} value={dataType} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Format</label>
          <input
            type="text"
            list="transformation-format-suggestions"
            className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold"
            value={tempEntry.format}
            placeholder="Select or type a format..."
            onChange={(e) => setTempEntry({ ...tempEntry, format: e.target.value })}
          />
          <datalist id="transformation-format-suggestions">
            {TRANSFORMATION_FORMATS.map((format) => (
              <option key={format} value={format} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={saveEntry}
          className="flex-1 py-3 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-colors"
        >
          {editingIndex !== null ? 'Update Transformation' : 'Add Transformation'}
        </button>
        {editingIndex !== null && (
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

interface EnrichmentSectionProps {
  enrichment: PovUseCases['enrichment'];
  povSources: PovSource[];
  canAddEntry: boolean;
  onChange: (enrichment: PovUseCases['enrichment']) => void;
}

function EnrichmentSection({ enrichment, povSources, canAddEntry, onChange }: EnrichmentSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempEntry, setTempEntry] = useState<EnrichmentEntry>({ ...EMPTY_ENRICHMENT_ENTRY });

  const resetForm = () => {
    setEditingIndex(null);
    setTempEntry({ ...EMPTY_ENRICHMENT_ENTRY });
  };

  const saveEntry = () => {
    if (!tempEntry.sourceKey || !tempEntry.description.trim()) return;
    const entry = {
      sourceKey: tempEntry.sourceKey,
      description: tempEntry.description.trim(),
    };
    if (editingIndex !== null) {
      onChange({
        ...enrichment,
        entries: enrichment.entries.map((item, i) => (i === editingIndex ? entry : item)),
      });
    } else {
      onChange({
        ...enrichment,
        entries: [...enrichment.entries, entry],
      });
    }
    resetForm();
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Source</th>
              <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Description</th>
              <th className="p-2 w-16" />
            </tr>
          </thead>
          <tbody>
            {enrichment.entries.length > 0 ? enrichment.entries.map((entry, index) => (
              <tr key={index} className="group border-t border-slate-100">
                <td className="p-2 font-medium text-slate-700">{resolveSourceLabel(povSources, entry.sourceKey) || '-'}</td>
                <td className="p-2 font-medium text-slate-700">{entry.description || '-'}</td>
                <td className="p-2">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(index);
                        setTempEntry({ ...entry });
                      }}
                      className="p-1 hover:text-[#2596be] text-slate-400 transition-colors cursor-pointer"
                      title="Edit Enrichment"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          ...enrichment,
                          entries: enrichment.entries.filter((_, i) => i !== index),
                        });
                        if (editingIndex === index) resetForm();
                      }}
                      className="p-1 hover:text-red-500 text-slate-400 transition-colors cursor-pointer"
                      title="Delete Enrichment"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  No enrichments added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!canAddEntry ? (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Add sources in POV Sources and Destinations first
        </p>
      ) : (
        <>
          <SectionHeader title={editingIndex !== null ? 'Edit Enrichment' : 'Add Enrichment'} />
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Source</label>
              <SourceSelect
                sources={povSources}
                value={tempEntry.sourceKey}
                onChange={(sourceKey) => setTempEntry({ ...tempEntry, sourceKey })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Description</label>
              <textarea
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs resize-none outline-none focus:ring-2 focus:ring-[#2596be]"
                value={tempEntry.description}
                placeholder="Describe the enrichment..."
                onChange={(e) => setTempEntry({ ...tempEntry, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveEntry}
              className="flex-1 py-3 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-colors"
            >
              {editingIndex !== null ? 'Update Enrichment' : 'Add Enrichment'}
            </button>
            {editingIndex !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface UseCaseSectionProps {
  title: string;
  enabled: boolean;
  expanded: boolean;
  summary?: string;
  onToggleEnabled: (enabled: boolean) => void;
  onToggleExpanded: () => void;
  children?: React.ReactNode;
}

function UseCaseSection({
  title,
  enabled,
  expanded,
  summary,
  onToggleEnabled,
  onToggleExpanded,
  children,
}: UseCaseSectionProps) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50">
        <label className="flex items-center gap-3 cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-[#2596be] border-slate-300"
          />
          <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{title}</span>
        </label>
        {enabled && !expanded && summary && (
          <span className="flex-1 text-[10px] font-medium text-slate-400 truncate text-right">{summary}</span>
        )}
        {enabled && (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-[#2596be] hover:bg-white transition-colors shrink-0"
            title={expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      {enabled && expanded && <div className="p-4 space-y-3 border-t border-slate-100">{children}</div>}
    </div>
  );
}

function MaskingSection({
  masking,
  povSources,
  onChange,
}: {
  masking: PovUseCases['masking'];
  povSources: PovSource[];
  onChange: (masking: PovUseCases['masking']) => void;
}) {
  if (povSources.length === 0) {
    return (
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        Add sources in POV Sources and Destinations first
      </p>
    );
  }

  const isSelected = (sourceKey: string) => masking.entries.some((entry) => entry.sourceKey === sourceKey);

  const getMaskedFields = (sourceKey: string) =>
    masking.entries.find((entry) => entry.sourceKey === sourceKey)?.maskedFields ?? 'TBD';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 px-1 pb-1">
        <span />
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Source</span>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fields to Mask</span>
      </div>
      {povSources.map((source) => {
        const key = povSourceKey(source);
        const checked = isSelected(key);
        return (
          <div key={key} className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center px-3 py-2 bg-slate-50 rounded-md">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange({
                    ...masking,
                    entries: [...masking.entries, { sourceKey: key, maskedFields: 'TBD' }],
                  });
                } else {
                  onChange({
                    ...masking,
                    entries: masking.entries.filter((entry) => entry.sourceKey !== key),
                  });
                }
              }}
              className="w-4 h-4 rounded text-[#2596be] border-slate-300"
            />
            <span className="text-xs font-medium text-slate-600">{formatSourceLabel(source)}</span>
            <input
              type="text"
              disabled={!checked}
              value={checked ? getMaskedFields(key) : ''}
              placeholder="TBD"
              onChange={(e) => {
                onChange({
                  ...masking,
                  entries: masking.entries.map((entry) =>
                    entry.sourceKey === key ? { ...entry, maskedFields: e.target.value } : entry,
                  ),
                });
              }}
              className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>
        );
      })}
    </div>
  );
}

function SourceCheckboxList({
  sources,
  selectedKeys,
  onChange,
  emptyMessage,
}: {
  sources: PovSource[];
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  emptyMessage: string;
}) {
  if (sources.length === 0) {
    return <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emptyMessage}</p>;
  }
  return (
    <div className="space-y-2">
      {sources.map((source) => {
        const key = povSourceKey(source);
        return (
          <label key={key} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-md cursor-pointer">
            <input
              type="checkbox"
              checked={selectedKeys.includes(key)}
              onChange={(e) => onChange(toggleKey(selectedKeys, key, e.target.checked))}
              className="w-4 h-4 rounded text-[#2596be] border-slate-300"
            />
            <span className="text-xs font-medium text-slate-600">{formatSourceLabel(source)}</span>
          </label>
        );
      })}
    </div>
  );
}

function SourceSelect({
  sources,
  value,
  onChange,
}: {
  sources: PovSource[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select source...</option>
      {sources.map((source) => {
        const key = povSourceKey(source);
        return (
          <option key={key} value={key}>
            {formatSourceLabel(source)}
          </option>
        );
      })}
    </select>
  );
}

function DestinationSelect({
  destinations,
  value,
  onChange,
}: {
  destinations: PovDestination[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select destination...</option>
      {destinations.map((destination) => {
        const key = povDestinationKey(destination);
        return (
          <option key={key} value={key}>
            {formatDestinationLabel(destination)}
          </option>
        );
      })}
    </select>
  );
}

export interface UseCasesModalProps {
  povSources: PovSource[];
  povDestinations: PovDestination[];
  useCases: PovUseCases;
  onChange: (useCases: PovUseCases) => void;
  onClose: () => void;
}

type UseCaseSectionKey =
  | 'routing'
  | 'optimization'
  | 'transformation'
  | 'masking'
  | 'logsToMetrics'
  | 'enrichment'
  | 'dataTiering'
  | 'replayRehydration'
  | 'searchAndAnalyze';

function getUseCaseSummary(key: UseCaseSectionKey, useCases: PovUseCases): string {
  switch (key) {
    case 'routing':
      return useCases.routing.entries.length === 0
        ? 'No routes'
        : `${useCases.routing.entries.length} route${useCases.routing.entries.length === 1 ? '' : 's'}`;
    case 'optimization':
      return useCases.optimization.entries.length === 0
        ? 'No sources'
        : `${useCases.optimization.entries.length} source${useCases.optimization.entries.length === 1 ? '' : 's'}`;
    case 'transformation':
      return useCases.transformation.entries.length === 0
        ? 'No transformations'
        : `${useCases.transformation.entries.length} transformation${useCases.transformation.entries.length === 1 ? '' : 's'}`;
    case 'masking':
      return useCases.masking.entries.length === 0
        ? 'No sources'
        : `${useCases.masking.entries.length} source${useCases.masking.entries.length === 1 ? '' : 's'}`;
    case 'logsToMetrics':
      return useCases.logsToMetrics.sourceKeys.length === 0
        ? 'No sources'
        : `${useCases.logsToMetrics.sourceKeys.length} source${useCases.logsToMetrics.sourceKeys.length === 1 ? '' : 's'}`;
    case 'enrichment':
      return useCases.enrichment.entries.length === 0
        ? 'No enrichments'
        : `${useCases.enrichment.entries.length} enrichment${useCases.enrichment.entries.length === 1 ? '' : 's'}`;
    case 'dataTiering':
      return useCases.dataTiering.description.trim() ? 'Configured' : 'Not configured';
    case 'replayRehydration':
      return useCases.replayRehydration.rehydrateFrom.trim() || 'Not configured';
    case 'searchAndAnalyze': {
      const count = SEARCH_ANALYZE_OPTIONS.filter(({ key: optionKey }) => useCases.searchAndAnalyze[optionKey]).length;
      return count === 0 ? 'No options selected' : `${count} option${count === 1 ? '' : 's'} selected`;
    }
    default:
      return '';
  }
}

let lastActiveUseCaseSection: UseCaseSectionKey | null = null;

function isUseCaseSectionEnabled(useCases: PovUseCases, key: UseCaseSectionKey): boolean {
  return useCases[key].enabled;
}

function getInitialActiveSection(useCases: PovUseCases): UseCaseSectionKey | null {
  if (lastActiveUseCaseSection && isUseCaseSectionEnabled(useCases, lastActiveUseCaseSection)) {
    return lastActiveUseCaseSection;
  }
  return null;
}

export function UseCasesModal({ povSources, povDestinations, useCases, onChange, onClose }: UseCasesModalProps) {
  const patch = (partial: Partial<PovUseCases>) => onChange({ ...useCases, ...partial });
  const [activeSection, setActiveSection] = useState<UseCaseSectionKey | null>(() => getInitialActiveSection(useCases));

  const isExpanded = (key: UseCaseSectionKey) => activeSection === key;

  const activateSection = (key: UseCaseSectionKey) => {
    lastActiveUseCaseSection = key;
    setActiveSection(key);
  };

  const toggleExpanded = (key: UseCaseSectionKey) => {
    if (activeSection === key) {
      lastActiveUseCaseSection = key;
      setActiveSection(null);
    } else {
      activateSection(key);
    }
  };

  const handleEnable = (key: UseCaseSectionKey, enabled: boolean) => {
    if (enabled) {
      activateSection(key);
    } else if (activeSection === key) {
      setActiveSection(null);
    }
  };

  const sectionProps = (key: UseCaseSectionKey, onEnable: (enabled: boolean) => void) => ({
    expanded: isExpanded(key),
    summary: getUseCaseSummary(key, useCases),
    onToggleExpanded: () => toggleExpanded(key),
    onToggleEnabled: (enabled: boolean) => {
      onEnable(enabled);
      handleEnable(key, enabled);
    },
  });

  const canAddRoutingEntry = povSources.length > 0 && povDestinations.length > 0;
  const canAddOptimizationEntry = povSources.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] p-10 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-3xl font-black uppercase text-slate-900">Use Cases</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">High-Level Cribl Use Cases</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-400">✕</button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          <UseCaseSection
            title="Routing"
            enabled={useCases.routing.enabled}
            {...sectionProps('routing', (enabled) => patch({ routing: { ...useCases.routing, enabled } }))}
          >
            <RoutingSection
              routing={useCases.routing}
              povSources={povSources}
              povDestinations={povDestinations}
              canAddRoutingEntry={canAddRoutingEntry}
              onChange={(routing) => patch({ routing })}
            />
          </UseCaseSection>

          <UseCaseSection
            title="Optimization"
            enabled={useCases.optimization.enabled}
            {...sectionProps('optimization', (enabled) => patch({ optimization: { ...useCases.optimization, enabled } }))}
          >
            <OptimizationSection
              optimization={useCases.optimization}
              povSources={povSources}
              canAddEntry={canAddOptimizationEntry}
              onChange={(optimization) => patch({ optimization })}
            />
          </UseCaseSection>

          <UseCaseSection
            title="Transformation"
            enabled={useCases.transformation.enabled}
            {...sectionProps('transformation', (enabled) => patch({ transformation: { ...useCases.transformation, enabled } }))}
          >
            <TransformationSection
              transformation={useCases.transformation}
              onChange={(transformation) => patch({ transformation })}
            />
          </UseCaseSection>

          <UseCaseSection
            title="Masking"
            enabled={useCases.masking.enabled}
            {...sectionProps('masking', (enabled) => patch({ masking: { ...useCases.masking, enabled } }))}
          >
            <MaskingSection
              masking={useCases.masking}
              povSources={povSources}
              onChange={(masking) => patch({ masking })}
            />
          </UseCaseSection>

          <UseCaseSection
            title="Logs to Metrics"
            enabled={useCases.logsToMetrics.enabled}
            {...sectionProps('logsToMetrics', (enabled) => patch({ logsToMetrics: { ...useCases.logsToMetrics, enabled } }))}
          >
            <SourceCheckboxList
              sources={povSources}
              selectedKeys={useCases.logsToMetrics.sourceKeys}
              onChange={(sourceKeys) => patch({ logsToMetrics: { ...useCases.logsToMetrics, sourceKeys } })}
              emptyMessage="Add sources in POV Sources and Destinations"
            />
          </UseCaseSection>

          <UseCaseSection
            title="Enrichment"
            enabled={useCases.enrichment.enabled}
            {...sectionProps('enrichment', (enabled) => patch({ enrichment: { ...useCases.enrichment, enabled } }))}
          >
            <EnrichmentSection
              enrichment={useCases.enrichment}
              povSources={povSources}
              canAddEntry={povSources.length > 0}
              onChange={(enrichment) => patch({ enrichment })}
            />
          </UseCaseSection>

          <UseCaseSection
            title="Data Tiering"
            enabled={useCases.dataTiering.enabled}
            {...sectionProps('dataTiering', (enabled) => patch({ dataTiering: { ...useCases.dataTiering, enabled } }))}
          >
            <textarea
              rows={4}
              className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-sm resize-none outline-none focus:ring-2 focus:ring-[#2596be]"
              value={useCases.dataTiering.description}
              placeholder="e.g. Optimized to Splunk, full fidelity to Lake"
              onChange={(e) => patch({ dataTiering: { ...useCases.dataTiering, description: e.target.value } })}
            />
          </UseCaseSection>

          <UseCaseSection
            title="Replay / Rehydration"
            enabled={useCases.replayRehydration.enabled}
            {...sectionProps('replayRehydration', (enabled) => patch({ replayRehydration: { ...useCases.replayRehydration, enabled } }))}
          >
            <input
              type="text"
              className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50"
              value={useCases.replayRehydration.rehydrateFrom}
              placeholder="e.g. Lake, S3"
              onChange={(e) => patch({ replayRehydration: { ...useCases.replayRehydration, rehydrateFrom: e.target.value } })}
            />
          </UseCaseSection>

          <UseCaseSection
            title="Search and Analyze"
            enabled={useCases.searchAndAnalyze.enabled}
            {...sectionProps('searchAndAnalyze', (enabled) => patch({ searchAndAnalyze: { ...useCases.searchAndAnalyze, enabled } }))}
          >
            <div className="grid grid-cols-2 gap-2">
              {SEARCH_ANALYZE_OPTIONS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCases.searchAndAnalyze[key]}
                    onChange={(e) => patch({
                      searchAndAnalyze: { ...useCases.searchAndAnalyze, [key]: e.target.checked },
                    })}
                    className="w-4 h-4 rounded text-[#2596be] border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                </label>
              ))}
            </div>
          </UseCaseSection>
        </div>

        <button
          onClick={onClose}
          className="w-full py-6 bg-[#2596be] text-white font-black uppercase tracking-widest rounded-3xl mt-8 shadow-xl hover:bg-[#1a7696] transition-all active:scale-[0.98]"
        >
          Save Use Cases
        </button>
      </div>
    </div>
  );
}

const docBoxLabelStyle: React.CSSProperties = {
  fontSize: '10pt',
  fontWeight: 'bold',
  color: '#64748b',
  textTransform: 'uppercase',
  marginBottom: '8pt',
  letterSpacing: '0.05em',
};

const docUseCaseSubheadingStyle: React.CSSProperties = {
  fontSize: '9pt',
  fontWeight: 'bold',
  color: '#228eb5',
  textTransform: 'uppercase',
  marginBottom: '6pt',
  letterSpacing: '0.05em',
};

const docCellStyle: React.CSSProperties = {
  border: '1pt solid #cbd5e1',
  padding: '8pt',
  fontSize: '9pt',
};

const docHeaderCellStyle: React.CSSProperties = {
  color: '#fff',
  padding: '8pt',
  fontSize: '9pt',
  textAlign: 'left',
};

const docBoxStyle: React.CSSProperties = {
  width: '100%',
  border: '1pt solid #cbd5e1',
  borderCollapse: 'collapse',
  marginTop: '12pt',
};

const docTableStyle: React.CSSProperties = {
  width: '100%',
  border: '1pt solid #cbd5e1',
  borderCollapse: 'collapse',
};

function DocUseCaseTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div>
      <p style={docUseCaseSubheadingStyle}>{title}</p>
      {rows.length > 0 ? (
        <table style={docTableStyle}>
          <thead style={{ backgroundColor: '#0f172a' }}>
            <tr>
              {columns.map((column) => (
                <th key={column} style={docHeaderCellStyle}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, rowIndex) => (
              <tr key={rowIndex}>
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex} style={docCellStyle}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={bodyStyle}>-</p>
      )}
    </div>
  );
}

export function UseCasesDocumentSection({
  useCases,
  povSources,
  povDestinations,
}: {
  useCases: PovUseCases;
  povSources: PovSource[];
  povDestinations: PovDestination[];
}) {
  const enabledCount = Object.values(useCases).filter((section) => section.enabled).length;
  const searchAndAnalyzeRows = SEARCH_ANALYZE_OPTIONS
    .filter(({ key }) => useCases.searchAndAnalyze[key])
    .map(({ label }) => [label]);

  return (
    <table style={docBoxStyle}>
      <tbody>
        <tr>
          <td style={{ padding: '15pt', verticalAlign: 'top', border: '1pt solid #cbd5e1' }}>
            <p style={docBoxLabelStyle}>Use Cases</p>
            {enabledCount === 0 ? (
              <p style={bodyStyle}>-</p>
            ) : (
              <div className="space-y-4">
                {useCases.routing.enabled && (
                  <DocUseCaseTable
                    title="Routing"
                    columns={['Source', 'Fidelity', 'Destination', 'Format']}
                    rows={useCases.routing.entries.map((entry) => [
                      resolveSourceLabel(povSources, entry.sourceKey) || '-',
                      entry.fidelity,
                      resolveDestinationLabel(povDestinations, entry.destinationKey) || '-',
                      formatRoutingFormatLabel(entry.format, entry.formatOther),
                    ])}
                  />
                )}

                {useCases.optimization.enabled && (
                  <DocUseCaseTable
                    title="Optimization"
                    columns={['Source', 'Expected %']}
                    rows={useCases.optimization.entries.map((entry) => [
                      resolveSourceLabel(povSources, entry.sourceKey) || '-',
                      formatOptimizationPercent(entry.optimizationPercent),
                    ])}
                  />
                )}

                {useCases.transformation.enabled && (
                  <DocUseCaseTable
                    title="Transformation"
                    columns={['Data Type', 'Format']}
                    rows={useCases.transformation.entries.map((entry) => [
                      entry.dataType || '-',
                      entry.format || '-',
                    ])}
                  />
                )}

                {useCases.masking.enabled && (
                  <DocUseCaseTable
                    title="Masking"
                    columns={['Source', 'Fields to Mask']}
                    rows={useCases.masking.entries.map((entry) => [
                      resolveSourceLabel(povSources, entry.sourceKey) || '-',
                      entry.maskedFields || 'TBD',
                    ])}
                  />
                )}

                {useCases.logsToMetrics.enabled && (
                  <DocUseCaseTable
                    title="Logs to Metrics"
                    columns={['Source']}
                    rows={useCases.logsToMetrics.sourceKeys.map((key) => [
                      resolveSourceLabel(povSources, key) || '-',
                    ])}
                  />
                )}

                {useCases.enrichment.enabled && (
                  <DocUseCaseTable
                    title="Enrichment"
                    columns={['Source', 'Description']}
                    rows={useCases.enrichment.entries.map((entry) => [
                      resolveSourceLabel(povSources, entry.sourceKey) || '-',
                      entry.description || '-',
                    ])}
                  />
                )}

                {useCases.dataTiering.enabled && (
                  <DocUseCaseTable
                    title="Data Tiering"
                    columns={['Description']}
                    rows={useCases.dataTiering.description.trim()
                      ? [[useCases.dataTiering.description.trim()]]
                      : []}
                  />
                )}

                {useCases.replayRehydration.enabled && (
                  <DocUseCaseTable
                    title="Replay / Rehydration"
                    columns={['Rehydrate From']}
                    rows={useCases.replayRehydration.rehydrateFrom.trim()
                      ? [[useCases.replayRehydration.rehydrateFrom.trim()]]
                      : []}
                  />
                )}

                {useCases.searchAndAnalyze.enabled && (
                  <DocUseCaseTable
                    title="Search and Analyze"
                    columns={['Feature']}
                    rows={searchAndAnalyzeRows}
                  />
                )}
              </div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export { EMPTY_POV_USE_CASES, countEnabledUseCases, mergePovUseCases };