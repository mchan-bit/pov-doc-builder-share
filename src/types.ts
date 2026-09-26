export interface ContentItem {
  category: CategoryType;
  label: string;
  title: string;
  content: string;
}

export type CategoryType = 
  | 'ENVIRONMENT' 
  | 'REQUIRED PORTS' 
  | 'SENDERS & DATASOURCES' 
  | 'CRIBL SOURCE CONFIGS' 
  | 'RECEIVERS & DATA DESTINATIONS' 
  | 'CRIBL DESTINATION CONFIGS' 
  | 'SEARCH' 
  | 'LAKE'
  | 'SUCCESS CRITERIA';

export interface POVInfo {
  customerName: string;
  rsmName: string;
  rsmEmail: string;
  seName: string;
  seEmail: string;
  customerExecSponsor: string;
  customerExecSponsorEmail: string;
  customerTechLead: string;
  customerTechLeadEmail: string;
  kickoffDate: string;
  targetReadoutDate: string;
  logo: string | null;
  brandLogo: string | null;
}

export interface PovSource {
  dataType: string;
  source: string;
}

export interface PovDestination {
  siemSoa: string;
  destination: string;
}

export interface TransformationEntry {
  dataType: string;
  format: string;
}

export interface OptimizationEntry {
  sourceKey: string;
  optimizationPercent: string;
}

export interface MaskingEntry {
  sourceKey: string;
  maskedFields: string;
}

export interface EnrichmentEntry {
  sourceKey: string;
  description: string;
}

export type RoutingFidelity = 'Optimized' | 'Full Fidelity';

export type RoutingFormat = 'XML' | 'JSON' | 'CSV' | 'Parquet' | 'OCSF' | 'Other';

export interface RoutingEntry {
  sourceKey: string;
  destinationKey: string;
  fidelity: RoutingFidelity;
  format: RoutingFormat;
  formatOther: string;
}

export interface PovUseCases {
  routing: {
    enabled: boolean;
    entries: RoutingEntry[];
  };
  optimization: {
    enabled: boolean;
    entries: OptimizationEntry[];
  };
  transformation: {
    enabled: boolean;
    entries: TransformationEntry[];
  };
  masking: {
    enabled: boolean;
    entries: MaskingEntry[];
  };
  logsToMetrics: {
    enabled: boolean;
    sourceKeys: string[];
  };
  enrichment: {
    enabled: boolean;
    entries: EnrichmentEntry[];
  };
  dataTiering: {
    enabled: boolean;
    description: string;
  };
  replayRehydration: {
    enabled: boolean;
    rehydrateFrom: string;
  };
  searchAndAnalyze: {
    enabled: boolean;
    searchData: boolean;
    dashboards: boolean;
    savedSearches: boolean;
    alerts: boolean;
    federatedSearch: boolean;
    lakehouseEngine: boolean;
    autoDatatyping: boolean;
  };
}

export interface CustomPort {
  source: string;
  destination: string;
  protocol: string;
  port?: string;
  purpose: string;
  label?: string;
}

export interface SuccessCriteria {
  criteria: string;
  completed: boolean;
}

export interface DocumentConfig {
  checkedItems: string[];
  sessionCustomPorts: CustomPort[];
  sessionSuccessCriteria: SuccessCriteria[];
  sessionPovSources?: PovSource[];
  sessionPovDestinations?: PovDestination[];
  sessionPovUseCases?: PovUseCases;
  architectureImage: string | null;
  povInfo: POVInfo | null;
  architectureChecked: boolean;
}
