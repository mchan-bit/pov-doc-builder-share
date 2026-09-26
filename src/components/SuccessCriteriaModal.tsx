import React, { useState } from 'react';
import type { SuccessCriteria } from '../types';

export const SUCCESS_CRITERIA_PLACEHOLDER =
  'Ingest Palo Alto Traffic logs via the Syslog Source and route optimized logs to Splunk via the Splunk HEC destination.';

export const EMPTY_SUCCESS_CRITERIA: SuccessCriteria = {
  criteria: '',
  completed: false,
};

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-[#2596be] pb-2 mt-2 mb-2 first:mt-0">
      {title}
    </h4>
  );
}

function formatCriteriaStatus(completed: boolean): string {
  return completed ? 'Complete' : 'Incomplete';
}

export function mergeSuccessCriteria(value: unknown): SuccessCriteria[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      return { ...EMPTY_SUCCESS_CRITERIA };
    }
    const input = item as Partial<SuccessCriteria & { details?: string }>;
    const criteriaText = typeof input.criteria === 'string' ? input.criteria.trim() : '';
    const detailsText = typeof input.details === 'string' ? input.details.trim() : '';
    const criteria = criteriaText && detailsText
      ? `${criteriaText}: ${detailsText}`
      : criteriaText || detailsText;
    return {
      criteria,
      completed: !!input.completed,
    };
  });
}

export interface SuccessCriteriaModalProps {
  criteria: SuccessCriteria[];
  onChange: (criteria: SuccessCriteria[]) => void;
  onClose: () => void;
}

export function successCriteriaSummary(criteria: SuccessCriteria[]): string {
  if (criteria.length === 0) return 'Add success criteria...';
  return `${criteria.length} success criteri${criteria.length === 1 ? 'on' : 'a'}`;
}

export function SuccessCriteriaModal({ criteria, onChange, onClose }: SuccessCriteriaModalProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempEntry, setTempEntry] = useState<SuccessCriteria>({ ...EMPTY_SUCCESS_CRITERIA });

  const resetForm = () => {
    setEditingIndex(null);
    setTempEntry({ ...EMPTY_SUCCESS_CRITERIA });
  };

  const saveEntry = () => {
    if (!tempEntry.criteria.trim()) return;
    const entry: SuccessCriteria = {
      criteria: tempEntry.criteria.trim(),
      completed: tempEntry.completed,
    };
    if (editingIndex !== null) {
      onChange(criteria.map((item, i) => (i === editingIndex ? entry : item)));
    } else {
      onChange([...criteria, entry]);
    }
    resetForm();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] p-10 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-3xl font-black uppercase text-slate-900">Success Criteria</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">POV Success Criteria</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-400">✕</button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Success Criteria</th>
                  <th className="p-2 text-left text-[9px] font-black uppercase tracking-wider">Status</th>
                  <th className="p-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {criteria.length > 0 ? criteria.map((entry, index) => (
                  <tr key={index} className="group border-t border-slate-100">
                    <td className="p-2 font-medium text-slate-700">{entry.criteria || '-'}</td>
                    <td className="p-2 font-medium text-slate-700 whitespace-nowrap">{formatCriteriaStatus(entry.completed)}</td>
                    <td className="p-2">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIndex(index);
                            setTempEntry({ ...entry });
                          }}
                          className="p-1 hover:text-[#2596be] text-slate-400 transition-colors cursor-pointer"
                          title="Edit Success Criteria"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(criteria.filter((_, i) => i !== index));
                            if (editingIndex === index) resetForm();
                          }}
                          className="p-1 hover:text-red-500 text-slate-400 transition-colors cursor-pointer"
                          title="Delete Success Criteria"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      No success criteria added
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <SectionHeader title={editingIndex !== null ? 'Edit Success Criteria' : 'Add Success Criteria'} />
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Success Criteria</label>
              <textarea
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs resize-none outline-none focus:ring-2 focus:ring-[#2596be] placeholder:text-slate-400"
                value={tempEntry.criteria}
                placeholder={SUCCESS_CRITERIA_PLACEHOLDER}
                onChange={(e) => setTempEntry({ ...tempEntry, criteria: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer px-1">
              <input
                type="checkbox"
                checked={tempEntry.completed}
                onChange={(e) => setTempEntry({ ...tempEntry, completed: e.target.checked })}
                className="w-4 h-4 rounded text-[#2596be] border-slate-300"
              />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mark as Completed</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveEntry}
              className="flex-1 py-3 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-200 transition-colors"
            >
              {editingIndex !== null ? 'Update Success Criteria' : 'Add Success Criteria'}
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

        <button
          type="button"
          onClick={onClose}
          className="w-full py-6 bg-[#2596be] text-white font-black uppercase tracking-widest rounded-3xl mt-8 shadow-xl hover:bg-[#1a7696] transition-all active:scale-[0.98]"
        >
          Save Success Criteria
        </button>
      </div>
    </div>
  );
}

const bodyStyle: React.CSSProperties = {
  fontSize: '10pt',
  margin: '4pt 0',
  color: '#1e293b',
};

const docBoxLabelStyle: React.CSSProperties = {
  fontSize: '10pt',
  fontWeight: 'bold',
  color: '#64748b',
  textTransform: 'uppercase',
  marginBottom: '8pt',
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

export function SuccessCriteriaDocumentSection({ criteria }: { criteria: SuccessCriteria[] }) {
  return (
    <table style={docBoxStyle}>
      <tbody>
        <tr>
          <td style={{ padding: '15pt', verticalAlign: 'top', border: '1pt solid #cbd5e1' }}>
            <p style={docBoxLabelStyle}>Success Criteria</p>
            {criteria.length > 0 ? (
              <table style={{ width: '100%', border: '1pt solid #cbd5e1', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#0f172a' }}>
                  <tr>
                    <th style={{ ...docHeaderCellStyle, width: '90%' }}>Success Criteria</th>
                    <th style={{ ...docHeaderCellStyle, width: '10%', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((entry, index) => (
                    <tr key={index}>
                      <td style={docCellStyle}>{entry.criteria || '-'}</td>
                      <td style={{ ...docCellStyle, textAlign: 'center', fontSize: '12pt' }}>
                        {entry.completed ? '☑' : '☐'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={bodyStyle}>-</p>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
