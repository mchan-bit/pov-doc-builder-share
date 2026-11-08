import type { PovSource, PovDestination } from '../types';

export interface HostPortConfig {
  kind: 'hostport';
  defaultHost: string;
  defaultPort: number;
  portFields?: string[];
}

export interface UrlConfig {
  kind: 'url';
  defaultUrl: string;
}

export type EditableConfig = HostPortConfig | UrlConfig;

export interface CriblTypeMapping {
  criblType: string;
  label: string;
  defaultConfig: Record<string, unknown>;
  editableConfig?: EditableConfig;
}

export interface SourceDeploymentRow {
  povSource: PovSource;
  criblType: string;
  criblLabel: string;
  suggestedId: string;
  defaultConfig: Record<string, unknown>;
  known: boolean;
  editableConfig?: EditableConfig;
}

export interface DestinationDeploymentRow {
  povDestination: PovDestination;
  criblType: string;
  criblLabel: string;
  suggestedId: string;
  defaultConfig: Record<string, unknown>;
  known: boolean;
  editableConfig?: EditableConfig;
}

const hp = (defaultHost: string, defaultPort: number, portFields?: string[]): HostPortConfig => ({
  kind: 'hostport',
  defaultHost,
  defaultPort,
  ...(portFields ? { portFields } : {}),
});

const url = (defaultUrl: string): UrlConfig => ({
  kind: 'url',
  defaultUrl,
});

const SOURCE_MAP: Record<string, CriblTypeMapping> = {
  'syslog': {
    criblType: 'syslog',
    label: 'Syslog',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 514, ['udpPort', 'tcpPort']),
  },
  'splunk hec': {
    criblType: 'splunk_hec',
    label: 'Splunk HEC',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 8088),
  },
  'splunk tcp': {
    criblType: 'splunk',
    label: 'Splunk S2S',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 9997),
  },
  'http/s (bulk api)': {
    criblType: 'http',
    label: 'HTTP',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 10080),
  },
  'raw http/s': {
    criblType: 'http_raw',
    label: 'Raw HTTP',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 10081),
  },
  'opentelemetry (otel)': {
    criblType: 'open_telemetry',
    label: 'OpenTelemetry',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 4317),
  },
  'tcp json': {
    criblType: 'tcpjson',
    label: 'TCP JSON',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 10001),
  },
  'tcp (raw)': {
    criblType: 'tcp',
    label: 'TCP Raw',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 10002),
  },
  'udp (raw)': {
    criblType: 'raw_udp',
    label: 'UDP Raw',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 10003),
  },
  'windows event forwarder': {
    criblType: 'wef',
    label: 'Windows Event Forwarder',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 5985),
  },
  'netflow & ipfix': {
    criblType: 'netflow',
    label: 'NetFlow',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 2055),
  },
  'snmp trap': {
    criblType: 'snmp',
    label: 'SNMP Trap',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 162),
  },
  'prometheus remote write': {
    criblType: 'prometheus_rw',
    label: 'Prometheus Remote Write',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 9090),
  },
  'metrics': {
    criblType: 'metrics',
    label: 'Metrics',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 8125),
  },
  'amazon s3': {
    criblType: 's3',
    label: 'Amazon S3',
    defaultConfig: { region: 'us-east-1' },
  },
  'amazon sqs': {
    criblType: 'sqs',
    label: 'Amazon SQS',
    defaultConfig: { region: 'us-east-1' },
  },
  'amazon kinesis data streams': {
    criblType: 'kinesis',
    label: 'Amazon Kinesis',
    defaultConfig: { region: 'us-east-1' },
  },
  'amazon data firehose': {
    criblType: 'firehose',
    label: 'Amazon Data Firehose',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 8443),
  },
  'amazon security lake': {
    criblType: 'security_lake',
    label: 'Amazon Security Lake',
    defaultConfig: { region: 'us-east-1' },
  },
  'azure event hubs': {
    criblType: 'eventhub',
    label: 'Azure Event Hubs',
    defaultConfig: {},
  },
  'azure event hubs amqp': {
    criblType: 'eventhub',
    label: 'Azure Event Hubs',
    defaultConfig: {},
  },
  'azure blob storage': {
    criblType: 'azure_blob',
    label: 'Azure Blob Storage',
    defaultConfig: {},
  },
  'google cloud pub/sub': {
    criblType: 'google_pubsub',
    label: 'Google Cloud Pub/Sub',
    defaultConfig: {},
  },
  'kafka': {
    criblType: 'kafka',
    label: 'Kafka',
    defaultConfig: {},
  },
  'amazon msk': {
    criblType: 'msk',
    label: 'Amazon MSK',
    defaultConfig: {},
  },
  'confluent cloud': {
    criblType: 'confluent_cloud',
    label: 'Confluent Cloud',
    defaultConfig: {},
  },
  'crowdstrike fdr': {
    criblType: 'crowdstrike',
    label: 'CrowdStrike',
    defaultConfig: {},
  },
  'microsoft 365 services': {
    criblType: 'office365_service',
    label: 'Office 365 Services',
    defaultConfig: {},
  },
  'microsoft 365 activity': {
    criblType: 'office365_mgmt',
    label: 'Office 365 Activity',
    defaultConfig: {},
  },
  'microsoft 365 message trace': {
    criblType: 'office365_msg_trace',
    label: 'Office 365 Message Trace',
    defaultConfig: {},
  },
  'microsoft graph': {
    criblType: 'microsoft_graph',
    label: 'Microsoft Graph',
    defaultConfig: {},
  },
  'okta': {
    criblType: 'okta',
    label: 'Okta',
    defaultConfig: {},
  },
  'datadog agent': {
    criblType: 'datadog_agent',
    label: 'Datadog Agent',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 8282),
  },
  'elasticsearch api': {
    criblType: 'elastic',
    label: 'Elasticsearch',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 9200),
  },
  'grafana': {
    criblType: 'grafana',
    label: 'Grafana',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 3000),
  },
  'loki': {
    criblType: 'loki',
    label: 'Loki',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 3100),
  },
  'splunk search': {
    criblType: 'splunk_search',
    label: 'Splunk Search',
    defaultConfig: {},
  },
  'zscaler cloud nss': {
    criblType: 'zscaler_hec',
    label: 'Zscaler Cloud NSS',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 10080),
  },
  'cloudflare': {
    criblType: 'cloudflare_hec',
    label: 'Cloudflare',
    defaultConfig: {},
    editableConfig: hp('0.0.0.0', 10080),
  },
  'wiz': {
    criblType: 'wiz',
    label: 'Wiz',
    defaultConfig: {},
  },
};

const DESTINATION_MAP: Record<string, CriblTypeMapping> = {
  'splunk hec': {
    criblType: 'splunk_hec',
    label: 'Splunk HEC',
    defaultConfig: {},
    editableConfig: url('https://localhost:8088/services/collector/event'),
  },
  'splunk': {
    criblType: 'splunk',
    label: 'Splunk (S2S)',
    defaultConfig: {},
    editableConfig: hp('localhost', 9997),
  },
  'splunk s2s': {
    criblType: 'splunk',
    label: 'Splunk (S2S)',
    defaultConfig: {},
    editableConfig: hp('localhost', 9997),
  },
  'splunk tcp': {
    criblType: 'splunk',
    label: 'Splunk (S2S)',
    defaultConfig: {},
    editableConfig: hp('localhost', 9997),
  },
  'amazon s3': {
    criblType: 's3',
    label: 'Amazon S3',
    defaultConfig: { region: 'us-east-1' },
  },
  'cribl lake': {
    criblType: 'cribl_lake',
    label: 'Cribl Lake',
    defaultConfig: {},
  },
  'elasticsearch': {
    criblType: 'elastic',
    label: 'Elasticsearch',
    defaultConfig: {},
    editableConfig: url('https://localhost:9200'),
  },
  'datadog': {
    criblType: 'datadog',
    label: 'Datadog',
    defaultConfig: {},
  },
  'azure blob storage': {
    criblType: 'azure_blob',
    label: 'Azure Blob Storage',
    defaultConfig: {},
  },
  'azure event hubs': {
    criblType: 'azure_eventhub',
    label: 'Azure Event Hubs',
    defaultConfig: {},
  },
  'google cloud storage': {
    criblType: 'google_cloud_storage',
    label: 'Google Cloud Storage',
    defaultConfig: {},
  },
  'kafka': {
    criblType: 'kafka',
    label: 'Kafka',
    defaultConfig: {},
  },
  'syslog': {
    criblType: 'syslog',
    label: 'Syslog',
    defaultConfig: {},
    editableConfig: hp('localhost', 514),
  },
  'amazon kinesis': {
    criblType: 'kinesis',
    label: 'Amazon Kinesis',
    defaultConfig: { region: 'us-east-1' },
  },
  'amazon sqs': {
    criblType: 'sqs',
    label: 'Amazon SQS',
    defaultConfig: { region: 'us-east-1' },
  },
  'webhook': {
    criblType: 'webhook',
    label: 'Webhook',
    defaultConfig: {},
    editableConfig: url(''),
  },
  'amazon security lake': {
    criblType: 'security_lake',
    label: 'Amazon Security Lake',
    defaultConfig: { region: 'us-east-1' },
  },
  'sumo logic': {
    criblType: 'sumo_logic',
    label: 'Sumo Logic',
    defaultConfig: {},
    editableConfig: url(''),
  },
  'google chronicle': {
    criblType: 'google_chronicle',
    label: 'Google Chronicle',
    defaultConfig: {},
  },
  'cribl http': {
    criblType: 'cribl_http',
    label: 'Cribl HTTP',
    defaultConfig: {},
    editableConfig: url(''),
  },
  'azure sentinel': {
    criblType: 'sentinel',
    label: 'Microsoft Sentinel',
    defaultConfig: {},
  },
  'microsoft sentinel': {
    criblType: 'sentinel',
    label: 'Microsoft Sentinel',
    defaultConfig: {},
  },
  'new relic': {
    criblType: 'newrelic',
    label: 'New Relic',
    defaultConfig: {},
    editableConfig: url(''),
  },
  'crowdstrike': {
    criblType: 'crowdstrike_next_gen_siem',
    label: 'CrowdStrike',
    defaultConfig: {},
  },
};

function sanitizeId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

export function mapPovSources(sources: PovSource[]): SourceDeploymentRow[] {
  return sources.map((source) => {
    const mapping = SOURCE_MAP[source.source.toLowerCase().trim()];
    return {
      povSource: source,
      criblType: mapping?.criblType ?? '',
      criblLabel: mapping?.label ?? source.source,
      suggestedId: `pov_${sanitizeId(source.dataType)}__${sanitizeId(source.source)}`,
      defaultConfig: mapping?.defaultConfig ?? {},
      known: !!mapping,
      editableConfig: mapping?.editableConfig,
    };
  });
}

export function mapPovDestinations(destinations: PovDestination[]): DestinationDeploymentRow[] {
  return destinations.map((dest) => {
    const mapping = DESTINATION_MAP[dest.destination.toLowerCase().trim()];
    return {
      povDestination: dest,
      criblType: mapping?.criblType ?? '',
      criblLabel: mapping?.label ?? dest.destination,
      suggestedId: `pov_${sanitizeId(dest.siemSoa)}__${sanitizeId(dest.destination)}`,
      defaultConfig: mapping?.defaultConfig ?? {},
      known: !!mapping,
      editableConfig: mapping?.editableConfig,
    };
  });
}
