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
  logo: string | null;
  brandLogo: string | null;
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
  details: string;
  completed: boolean;
}

export interface DocumentConfig {
  checkedItems: string[];
  sessionCustomPorts: CustomPort[];
  sessionSuccessCriteria: SuccessCriteria[];
  architectureImage: string | null;
  povInfo: POVInfo | null;
  architectureChecked: boolean;
}