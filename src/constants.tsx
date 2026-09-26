
import React from 'react';

export const CATEGORIES = [
  'ENVIRONMENT', 
  'REQUIRED PORTS', 
  'SENDERS & DATASOURCES', 
  'CRIBL SOURCE CONFIGS', 
  'RECEIVERS & DATA DESTINATIONS', 
  'CRIBL DESTINATION CONFIGS', 
  'SEARCH', 
  'LAKE',
  'SUCCESS CRITERIA'
] as const;

/** Suggested values for the Data Type field in POV Sources and Destinations. */
export const POV_DATA_TYPE_SUGGESTIONS = [
  'Windows Event Logs',
  'PAN Firewall',
  'Other',
  'Linux OS',
  'AWS CloudTrail',
  'Crowdstrike FDR',
  'ZScaler',
  'Cisco ASA',
  'Fortinet Fortigate',
  'Checkpoint Firewall',
  'Office 365 Activity',
  'AWS VPC Flow Logs',
  'Office 365 Services',
  'Cisco FTD',
  'Office 365 Message Trace',
] as const;

/** Suggested values for the Source field in POV Sources and Destinations. */
export const POV_SOURCE_SUGGESTIONS = [
  'Amazon Data Firehose',
  'Cloudflare',
  'Datadog Agent',
  'Elasticsearch API',
  'Grafana',
  'HTTP/S (Bulk API)',
  'Raw HTTP/S',
  'Loki',
  'Metrics',
  'Model Driven Telemetry',
  'NetFlow & IPFIX',
  'OpenTelemetry (OTel)',
  'Prometheus Remote Write',
  'SNMP Trap',
  'Splunk HEC',
  'Splunk TCP',
  'Sysdig Cloud NSS',
  'Syslog',
  'TCP JSON',
  'TCP (Raw)',
  'UDP (Raw)',
  'Upwind',
  'Windows Event Forwarder',
  'Zscaler Cloud NSS',
  'Amazon Bedrock',
  'Amazon Kinesis Data Streams',
  'Amazon SQS',
  'Amazon S3',
  'Amazon Security Lake',
  'Claude Compliance',
  'Google Cloud Pub/Sub',
  'Azure Event Hubs',
  'Azure Event Hubs AMQP',
  'Azure Blob Storage',
  'Confluent Cloud',
  'CrowdStrike FDR',
  'Microsoft 365 Services',
  'Microsoft 365 Activity',
  'Microsoft 365 Message Trace',
  'Microsoft Graph',
  'Okta',
  'OpenAI',
  'OpenAI Compliance Logs',
  'Prometheus Scraper',
  'Kafka',
  'Amazon MSK',
  'Splunk Search',
  'ServiceNow Table API',
  'Wiz',
] as const;

/**
 * Brand Logo Source
 * Points to logo.png in the project root. 
 * For local development, ensure logo.png is present in your folder.
 */
export const BRAND_LOGO_URL = '/logo.png';

/** Height of the Cribl logo in the document preview header (px). */
export const BRAND_LOGO_DOC_HEIGHT = 72;

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'ENVIRONMENT': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  ),
  'REQUIRED PORTS': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="7" y="7" width="3" height="9"></rect>
      <rect x="14" y="7" width="3" height="9"></rect>
    </svg>
  ),
  'SENDERS & DATASOURCES': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"></path>
    </svg>
  ),
  'CRIBL SOURCE CONFIGS': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  ),
  'RECEIVERS & DATA DESTINATIONS': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"></path>
    </svg>
  ),
  'CRIBL DESTINATION CONFIGS': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
  ),
  'SEARCH': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  'LAKE': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 17c.5.5 1 .5 1.5 0s1-.5 1.5 0 1 .5 1.5 0 1-.5 1.5 0 1 .5 1.5 0 1-.5 1.5 0 1 .5 1.5 0 1-.5 1.5 0 1-.5 1.5 0 1-.5 1.5 0 1-.5 1.5 0"></path>
      <path d="M2 13c.5.5 1 .5 1.5 0s1-.5 1.5 0 1 .5 1.5 0 1-.5 1.5 0 1-.5 1.5 0 1-.5 1.5 0 1 .5 1.5 0 1-.5 1.5 0 1-.5 1.5 0"></path>
      <path d="M17 21v-4"></path>
      <path d="M7 21v-4"></path>
      <rect x="3" y="3" width="18" height="10" rx="2"></rect>
    </svg>
  ),
  'SUCCESS CRITERIA': (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
};

export const SUCCESS_CRITERIA_OPTIONS = [
  'Data Onboarding',
  'Routing',
  'Optimization',
  'Masking & Obfuscation',
  'Replay | Rehydrate',
  'Transformation',
  'Search and Analysis',
  'Retention & Compliance'
];
