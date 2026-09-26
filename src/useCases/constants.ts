import type { EnrichmentEntry, MaskingEntry, OptimizationEntry, PovUseCases, RoutingEntry, RoutingFidelity, RoutingFormat, TransformationEntry } from '../types';

export const ROUTING_FIDELITIES: RoutingFidelity[] = ['Optimized', 'Full Fidelity'];

export const ROUTING_FORMATS: RoutingFormat[] = ['XML', 'JSON', 'CSV', 'Parquet', 'OCSF', 'Other'];

export const EMPTY_ROUTING_ENTRY: RoutingEntry = {
  sourceKey: '',
  destinationKey: '',
  fidelity: 'Optimized',
  format: 'JSON',
  formatOther: '',
};

export const EMPTY_OPTIMIZATION_ENTRY: OptimizationEntry = {
  sourceKey: '',
  optimizationPercent: '',
};

export const TRANSFORMATION_FORMATS = [
  'CSV',
  'JSON',
  'Key=Value pairs',
  'Extended Log File Format',
  'Common Log Format',
  'Delimited Values',
  'Parquet',
  'CEF',
  'SNMP Trap',
  'Syslog RFC',
  'OTLP',
  'OCSF',
  'UDM',
] as const;

export const EMPTY_TRANSFORMATION_ENTRY: TransformationEntry = {
  dataType: '',
  format: '',
};

export const EMPTY_MASKING_ENTRY: MaskingEntry = {
  sourceKey: '',
  maskedFields: 'TBD',
};

export const EMPTY_ENRICHMENT_ENTRY: EnrichmentEntry = {
  sourceKey: '',
  description: '',
};

export const SEARCH_ANALYZE_OPTIONS = [
  { key: 'searchData' as const, label: 'Search data' },
  { key: 'dashboards' as const, label: 'Dashboards' },
  { key: 'savedSearches' as const, label: 'Saved searches' },
  { key: 'alerts' as const, label: 'Alerts' },
  { key: 'federatedSearch' as const, label: 'Federated search' },
  { key: 'lakehouseEngine' as const, label: 'Lakehouse Engine' },
  { key: 'autoDatatyping' as const, label: 'Auto datatyping' },
];

export const EMPTY_POV_USE_CASES: PovUseCases = {
  routing: { enabled: false, entries: [] },
  optimization: { enabled: false, entries: [] },
  transformation: { enabled: false, entries: [] },
  masking: { enabled: false, entries: [] },
  logsToMetrics: { enabled: false, sourceKeys: [] },
  enrichment: { enabled: false, entries: [] },
  dataTiering: { enabled: false, description: '' },
  replayRehydration: { enabled: false, rehydrateFrom: '' },
  searchAndAnalyze: {
    enabled: false,
    searchData: false,
    dashboards: false,
    savedSearches: false,
    alerts: false,
    federatedSearch: false,
    lakehouseEngine: false,
    autoDatatyping: false,
  },
};

export function countEnabledUseCases(useCases: PovUseCases): number {
  return Object.values(useCases).filter((section) => section.enabled).length;
}

function mergeRoutingEntry(value: unknown): RoutingEntry {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_ROUTING_ENTRY };
  }
  const input = value as Partial<RoutingEntry>;
  const format = ROUTING_FORMATS.includes(input.format as RoutingFormat)
    ? (input.format as RoutingFormat)
    : EMPTY_ROUTING_ENTRY.format;
  const fidelity = ROUTING_FIDELITIES.includes(input.fidelity as RoutingFidelity)
    ? (input.fidelity as RoutingFidelity)
    : EMPTY_ROUTING_ENTRY.fidelity;
  return {
    sourceKey: typeof input.sourceKey === 'string' ? input.sourceKey : '',
    destinationKey: typeof input.destinationKey === 'string' ? input.destinationKey : '',
    fidelity,
    format,
    formatOther: typeof input.formatOther === 'string' ? input.formatOther : '',
  };
}

function mergeRouting(value: unknown): PovUseCases['routing'] {
  if (!value || typeof value !== 'object') {
    return structuredClone(EMPTY_POV_USE_CASES.routing);
  }
  const input = value as Record<string, unknown>;
  if (Array.isArray(input.entries)) {
    return {
      enabled: !!input.enabled,
      entries: input.entries.map(mergeRoutingEntry),
    };
  }
  const sourceKeys = Array.isArray(input.sourceKeys)
    ? input.sourceKeys.filter((key): key is string => typeof key === 'string')
    : [];
  const destinationKeys = Array.isArray(input.destinationKeys)
    ? input.destinationKeys.filter((key): key is string => typeof key === 'string')
    : [];
  const entries: RoutingEntry[] = [];
  for (const sourceKey of sourceKeys) {
    for (const destinationKey of destinationKeys) {
      entries.push({ ...EMPTY_ROUTING_ENTRY, sourceKey, destinationKey });
    }
  }
  return { enabled: !!input.enabled, entries };
}

function mergeTransformationEntry(value: unknown): TransformationEntry {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_TRANSFORMATION_ENTRY };
  }
  const input = value as Partial<TransformationEntry & { sourceKey?: string }>;
  return {
    dataType: typeof input.dataType === 'string' ? input.dataType : '',
    format: typeof input.format === 'string' ? input.format : '',
  };
}

function mergeTransformation(value: unknown): PovUseCases['transformation'] {
  if (!value || typeof value !== 'object') {
    return structuredClone(EMPTY_POV_USE_CASES.transformation);
  }
  const input = value as Record<string, unknown>;
  return {
    enabled: !!input.enabled,
    entries: Array.isArray(input.entries) ? input.entries.map(mergeTransformationEntry) : [],
  };
}

function mergeMaskingEntry(value: unknown): MaskingEntry {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_MASKING_ENTRY };
  }
  const input = value as Partial<MaskingEntry>;
  return {
    sourceKey: typeof input.sourceKey === 'string' ? input.sourceKey : '',
    maskedFields: typeof input.maskedFields === 'string' && input.maskedFields.trim()
      ? input.maskedFields
      : 'TBD',
  };
}

function mergeMasking(value: unknown): PovUseCases['masking'] {
  if (!value || typeof value !== 'object') {
    return structuredClone(EMPTY_POV_USE_CASES.masking);
  }
  const input = value as Record<string, unknown>;
  if (Array.isArray(input.entries)) {
    return {
      enabled: !!input.enabled,
      entries: input.entries.map(mergeMaskingEntry),
    };
  }
  const sourceKeys = Array.isArray(input.sourceKeys)
    ? input.sourceKeys.filter((key): key is string => typeof key === 'string')
    : [];
  return {
    enabled: !!input.enabled,
    entries: sourceKeys.map((sourceKey) => ({ sourceKey, maskedFields: 'TBD' })),
  };
}

export function mergePovUseCases(value: unknown): PovUseCases {
  if (!value || typeof value !== 'object') {
    return structuredClone(EMPTY_POV_USE_CASES);
  }
  const input = value as Partial<PovUseCases>;
  return {
    routing: mergeRouting(input.routing),
    optimization: { ...EMPTY_POV_USE_CASES.optimization, ...input.optimization },
    transformation: mergeTransformation(input.transformation),
    masking: mergeMasking(input.masking),
    logsToMetrics: { ...EMPTY_POV_USE_CASES.logsToMetrics, ...input.logsToMetrics },
    enrichment: { ...EMPTY_POV_USE_CASES.enrichment, ...input.enrichment },
    dataTiering: { ...EMPTY_POV_USE_CASES.dataTiering, ...input.dataTiering },
    replayRehydration: { ...EMPTY_POV_USE_CASES.replayRehydration, ...input.replayRehydration },
    searchAndAnalyze: { ...EMPTY_POV_USE_CASES.searchAndAnalyze, ...input.searchAndAnalyze },
  };
}
