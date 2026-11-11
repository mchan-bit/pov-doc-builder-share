import type { PovSource, PovDestination } from '../types';

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  default?: string | number | boolean;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  description?: string;
  wide?: boolean;
}

export interface CriblTypeMapping {
  criblType: string;
  label: string;
  defaultConfig: Record<string, unknown>;
  fields?: ConfigField[];
}

export interface SourceDeploymentRow {
  povSource: PovSource;
  criblType: string;
  criblLabel: string;
  suggestedId: string;
  defaultConfig: Record<string, unknown>;
  known: boolean;
  fields: ConfigField[];
}

export interface DestinationDeploymentRow {
  povDestination: PovDestination;
  criblType: string;
  criblLabel: string;
  suggestedId: string;
  defaultConfig: Record<string, unknown>;
  known: boolean;
  fields: ConfigField[];
}

// ─── Field helpers ───

const f = {
  host: (defaultVal = '0.0.0.0', required = false): ConfigField => ({
    key: 'host', label: 'Host', type: 'text', default: defaultVal, required, placeholder: '0.0.0.0',
  }),
  destHost: (defaultVal = 'localhost'): ConfigField => ({
    key: 'host', label: 'Host', type: 'text', default: defaultVal, required: true, placeholder: 'hostname or IP',
  }),
  port: (defaultVal: number, required = false): ConfigField => ({
    key: 'port', label: 'Port', type: 'number', default: defaultVal, required, placeholder: String(defaultVal),
  }),
  udpPort: (defaultVal: number): ConfigField => ({
    key: 'udpPort', label: 'UDP Port', type: 'number', default: defaultVal, placeholder: String(defaultVal),
  }),
  tcpPort: (defaultVal: number): ConfigField => ({
    key: 'tcpPort', label: 'TCP Port', type: 'number', default: defaultVal, placeholder: String(defaultVal),
  }),
  tls: (): ConfigField => ({
    key: '_tls', label: 'TLS', type: 'boolean', default: false,
  }),
  url: (defaultVal: string, required = false, label = 'URL'): ConfigField => ({
    key: 'url', label, type: 'text', default: defaultVal, required, placeholder: 'https://host:port/path', wide: true,
  }),
  region: (defaultVal = 'us-east-1'): ConfigField => ({
    key: 'region', label: 'Region', type: 'text', default: defaultVal, required: true, placeholder: 'us-east-1',
  }),
  bucket: (placeholder = 'my-bucket'): ConfigField => ({
    key: 'bucket', label: 'Bucket', type: 'text', default: '', required: true, placeholder,
  }),
  stagePath: (defaultVal = ''): ConfigField => ({
    key: 'stagePath', label: 'Stage Path', type: 'text', default: defaultVal, required: true, placeholder: '/tmp/cribl',
  }),
  index: (defaultVal = ''): ConfigField => ({
    key: 'index', label: 'Index', type: 'text', default: defaultVal, required: true, placeholder: 'main',
  }),
  token: (label = 'Token'): ConfigField => ({
    key: 'token', label, type: 'text', default: '', placeholder: 'auth token',
  }),
  brokers: (): ConfigField => ({
    key: '_brokers', label: 'Brokers', type: 'text', default: '', required: true, placeholder: 'broker1:9092,broker2:9092', wide: true,
  }),
  topic: (): ConfigField => ({
    key: 'topic', label: 'Topic', type: 'text', default: '', required: true, placeholder: 'my-topic',
  }),
  queueName: (): ConfigField => ({
    key: 'queueName', label: 'Queue Name', type: 'text', default: '', required: true, placeholder: 'my-queue',
  }),
  queueType: (): ConfigField => ({
    key: 'queueType', label: 'Queue Type', type: 'select', default: 'standard', required: true,
    options: [{ label: 'Standard', value: 'standard' }, { label: 'FIFO', value: 'fifo' }],
  }),
  streamName: (): ConfigField => ({
    key: 'streamName', label: 'Stream Name', type: 'text', default: '', required: true, placeholder: 'my-stream',
  }),
  containerName: (): ConfigField => ({
    key: 'containerName', label: 'Container Name', type: 'text', default: '', required: true, placeholder: 'my-container',
  }),
  protocol: (): ConfigField => ({
    key: 'protocol', label: 'Protocol', type: 'select', default: 'tcp',
    options: [{ label: 'TCP', value: 'tcp' }, { label: 'UDP', value: 'udp' }],
  }),
  logFormatType: (): ConfigField => ({
    key: 'logFormatType', label: 'Log Format', type: 'select', default: 'unstructured', required: true,
    options: [{ label: 'Unstructured (Raw)', value: 'unstructured' }, { label: 'UDM', value: 'udm' }],
  }),
  format: (defaultVal = 'JSON'): ConfigField => ({
    key: 'format', label: 'Format', type: 'select', default: defaultVal, required: true,
    options: [{ label: 'JSON', value: 'JSON' }, { label: 'Raw', value: 'raw' }],
  }),
  endpoint: (placeholder = 'https://...'): ConfigField => ({
    key: 'endpoint', label: 'Endpoint', type: 'text', default: '', placeholder, wide: true,
  }),
  customerId: (): ConfigField => ({
    key: 'customerId', label: 'Customer ID', type: 'text', default: '', placeholder: 'UUID',
  }),
  accountId: (): ConfigField => ({
    key: 'accountId', label: 'AWS Account ID', type: 'text', default: '', required: true, placeholder: '123456789012',
  }),
  customSource: (): ConfigField => ({
    key: 'customSource', label: 'Custom Source', type: 'text', default: '', required: true, placeholder: 'my-source',
  }),
  assumeRoleArn: (): ConfigField => ({
    key: 'assumeRoleArn', label: 'Assume Role ARN', type: 'text', default: '', required: true, placeholder: 'arn:aws:iam::role/...', wide: true,
  }),
  endpointURLConfiguration: (): ConfigField => ({
    key: 'endpointURLConfiguration', label: 'Endpoint Config', type: 'select', default: 'url', required: true,
    options: [{ label: 'URL', value: 'url' }, { label: 'ID', value: 'ID' }],
  }),
  loginUrl: (): ConfigField => ({
    key: 'loginUrl', label: 'Login URL (OAuth)', type: 'text', default: '', required: true, placeholder: 'https://login.microsoftonline.com/...', wide: true,
  }),
  secret: (label = 'Secret'): ConfigField => ({
    key: 'secret', label, type: 'text', default: '', required: true, placeholder: 'client secret',
  }),
  clientId: (): ConfigField => ({
    key: 'client_id', label: 'Client ID', type: 'text', default: '', required: true, placeholder: 'application client ID',
  }),
};

// ─── Source mappings ───

const SOURCE_MAP: Record<string, CriblTypeMapping> = {
  'syslog': {
    criblType: 'syslog', label: 'Syslog', defaultConfig: {},
    fields: [f.host(), f.udpPort(514), f.tcpPort(514), f.tls()],
  },
  'splunk hec': {
    criblType: 'splunk_hec', label: 'Splunk HEC', defaultConfig: {},
    fields: [f.host(), f.port(8088), f.tls()],
  },
  'splunk tcp': {
    criblType: 'splunk', label: 'Splunk S2S', defaultConfig: {},
    fields: [f.host(), f.port(9997), f.tls()],
  },
  'http/s (bulk api)': {
    criblType: 'http', label: 'HTTP', defaultConfig: {},
    fields: [f.host(), f.port(10080), f.tls()],
  },
  'raw http/s': {
    criblType: 'http_raw', label: 'Raw HTTP', defaultConfig: {},
    fields: [f.host(), f.port(10081), f.tls()],
  },
  'opentelemetry (otel)': {
    criblType: 'open_telemetry', label: 'OpenTelemetry', defaultConfig: {},
    fields: [f.host(), f.port(4317), f.tls()],
  },
  'tcp json': {
    criblType: 'tcpjson', label: 'TCP JSON', defaultConfig: {},
    fields: [f.host(), f.port(10001), f.tls()],
  },
  'tcp (raw)': {
    criblType: 'tcp', label: 'TCP Raw', defaultConfig: {},
    fields: [f.host(), f.port(10002), f.tls()],
  },
  'udp (raw)': {
    criblType: 'raw_udp', label: 'UDP Raw', defaultConfig: {},
    fields: [f.host(), f.port(10003)],
  },
  'windows event forwarder': {
    criblType: 'wef', label: 'Windows Event Forwarder', defaultConfig: {},
    fields: [f.host(), f.port(5985), f.tls()],
  },
  'netflow & ipfix': {
    criblType: 'netflow', label: 'NetFlow', defaultConfig: {},
    fields: [f.host(), f.port(2055)],
  },
  'snmp trap': {
    criblType: 'snmp', label: 'SNMP Trap', defaultConfig: {},
    fields: [f.host(), f.port(162)],
  },
  'prometheus remote write': {
    criblType: 'prometheus_rw', label: 'Prometheus Remote Write', defaultConfig: {},
    fields: [f.host(), f.port(9090), f.tls()],
  },
  'metrics': {
    criblType: 'metrics', label: 'Metrics', defaultConfig: {},
    fields: [f.host(), f.port(8125)],
  },
  'amazon s3': {
    criblType: 's3', label: 'Amazon S3', defaultConfig: {},
    fields: [f.region(), f.bucket()],
  },
  'amazon sqs': {
    criblType: 'sqs', label: 'Amazon SQS', defaultConfig: {},
    fields: [f.region(), f.queueName()],
  },
  'amazon kinesis data streams': {
    criblType: 'kinesis', label: 'Amazon Kinesis', defaultConfig: {},
    fields: [f.region(), f.streamName()],
  },
  'amazon data firehose': {
    criblType: 'firehose', label: 'Amazon Data Firehose', defaultConfig: {},
    fields: [f.host(), f.port(8443), f.tls()],
  },
  'amazon security lake': {
    criblType: 'security_lake', label: 'Amazon Security Lake', defaultConfig: {},
    fields: [f.region()],
  },
  'azure event hubs': {
    criblType: 'eventhub', label: 'Azure Event Hubs', defaultConfig: {},
    fields: [f.brokers(), f.topic()],
  },
  'azure event hubs amqp': {
    criblType: 'eventhub', label: 'Azure Event Hubs', defaultConfig: {},
    fields: [f.brokers(), f.topic()],
  },
  'azure blob storage': {
    criblType: 'azure_blob', label: 'Azure Blob Storage', defaultConfig: {},
    fields: [f.containerName(), f.stagePath()],
  },
  'google cloud pub/sub': {
    criblType: 'google_pubsub', label: 'Google Cloud Pub/Sub', defaultConfig: {},
    fields: [f.topic()],
  },
  'kafka': {
    criblType: 'kafka', label: 'Kafka', defaultConfig: {},
    fields: [f.brokers(), f.topic(), f.tls()],
  },
  'amazon msk': {
    criblType: 'msk', label: 'Amazon MSK', defaultConfig: {},
    fields: [f.brokers(), f.topic(), f.tls()],
  },
  'confluent cloud': {
    criblType: 'confluent_cloud', label: 'Confluent Cloud', defaultConfig: {},
    fields: [f.brokers(), f.topic(), f.tls()],
  },
  'crowdstrike fdr': {
    criblType: 'crowdstrike', label: 'CrowdStrike', defaultConfig: {},
    fields: [],
  },
  'microsoft 365 services': {
    criblType: 'office365_service', label: 'Office 365 Services', defaultConfig: {},
    fields: [],
  },
  'microsoft 365 activity': {
    criblType: 'office365_mgmt', label: 'Office 365 Activity', defaultConfig: {},
    fields: [],
  },
  'microsoft 365 message trace': {
    criblType: 'office365_msg_trace', label: 'Office 365 Message Trace', defaultConfig: {},
    fields: [],
  },
  'microsoft graph': {
    criblType: 'microsoft_graph', label: 'Microsoft Graph', defaultConfig: {},
    fields: [],
  },
  'okta': {
    criblType: 'okta', label: 'Okta', defaultConfig: {},
    fields: [],
  },
  'datadog agent': {
    criblType: 'datadog_agent', label: 'Datadog Agent', defaultConfig: {},
    fields: [f.host(), f.port(8282), f.tls()],
  },
  'elasticsearch api': {
    criblType: 'elastic', label: 'Elasticsearch', defaultConfig: {},
    fields: [f.host(), f.port(9200), f.tls()],
  },
  'grafana': {
    criblType: 'grafana', label: 'Grafana', defaultConfig: {},
    fields: [f.host(), f.port(3000), f.tls()],
  },
  'loki': {
    criblType: 'loki', label: 'Loki', defaultConfig: {},
    fields: [f.host(), f.port(3100), f.tls()],
  },
  'splunk search': {
    criblType: 'splunk_search', label: 'Splunk Search', defaultConfig: {},
    fields: [],
  },
  'zscaler cloud nss': {
    criblType: 'zscaler_hec', label: 'Zscaler Cloud NSS', defaultConfig: {},
    fields: [f.host(), f.port(10080), f.tls()],
  },
  'cloudflare': {
    criblType: 'cloudflare_hec', label: 'Cloudflare', defaultConfig: {},
    fields: [f.host(), f.port(10080), f.tls()],
  },
  'wiz': {
    criblType: 'wiz', label: 'Wiz', defaultConfig: {},
    fields: [],
  },
};

// ─── Destination mappings (with ALL required fields from OpenAPI) ───

const DESTINATION_MAP: Record<string, CriblTypeMapping> = {
  'splunk hec': {
    criblType: 'splunk_hec', label: 'Splunk HEC', defaultConfig: {},
    fields: [f.url('https://localhost:8088/services/collector/event', false, 'HEC URL'), f.token('HEC Token'), f.tls()],
  },
  'splunk': {
    // Required: type, host, port
    criblType: 'splunk', label: 'Splunk S2S', defaultConfig: {},
    fields: [f.destHost('localhost'), f.port(9997, true), f.tls()],
  },
  'splunk s2s': {
    criblType: 'splunk', label: 'Splunk S2S', defaultConfig: {},
    fields: [f.destHost('localhost'), f.port(9997, true), f.tls()],
  },
  'splunk tcp': {
    criblType: 'splunk', label: 'Splunk S2S', defaultConfig: {},
    fields: [f.destHost('localhost'), f.port(9997, true), f.tls()],
  },
  'amazon s3': {
    // Required: type, bucket, stagePath
    criblType: 's3', label: 'Amazon S3', defaultConfig: {},
    fields: [f.region(), f.bucket('my-s3-bucket'), f.stagePath('/tmp/cribl')],
  },
  'cribl lake': {
    criblType: 'cribl_lake', label: 'Cribl Lake', defaultConfig: {},
    fields: [],
  },
  'elasticsearch': {
    // Required: type, index
    criblType: 'elastic', label: 'Elasticsearch', defaultConfig: {},
    fields: [f.url('https://localhost:9200', false, 'Cluster URL'), f.index('main'), f.tls()],
  },
  'datadog': {
    criblType: 'datadog', label: 'Datadog', defaultConfig: {},
    fields: [],
  },
  'azure blob storage': {
    // Required: type, containerName, stagePath
    criblType: 'azure_blob', label: 'Azure Blob Storage', defaultConfig: {},
    fields: [f.containerName(), f.stagePath('/tmp/cribl')],
  },
  'azure event hubs': {
    // Required: type, brokers, topic
    criblType: 'azure_eventhub', label: 'Azure Event Hubs', defaultConfig: {},
    fields: [f.brokers(), f.topic(), f.tls()],
  },
  'google cloud storage': {
    // Required: type, bucket, endpoint, region, stagePath
    criblType: 'google_cloud_storage', label: 'Google Cloud Storage', defaultConfig: {},
    fields: [
      f.bucket('my-gcs-bucket'),
      f.endpoint('https://storage.googleapis.com'),
      f.region('us-central1'),
      f.stagePath('/tmp/cribl'),
    ],
  },
  'kafka': {
    // Required: type, brokers, topic
    criblType: 'kafka', label: 'Kafka', defaultConfig: {},
    fields: [f.brokers(), f.topic(), f.tls()],
  },
  'syslog': {
    criblType: 'syslog', label: 'Syslog', defaultConfig: {},
    fields: [f.destHost('localhost'), f.port(514), f.protocol(), f.tls()],
  },
  'amazon kinesis': {
    // Required: type, streamName, region
    criblType: 'kinesis', label: 'Amazon Kinesis', defaultConfig: {},
    fields: [f.region(), f.streamName()],
  },
  'amazon sqs': {
    // Required: type, queueName, queueType
    criblType: 'sqs', label: 'Amazon SQS', defaultConfig: {},
    fields: [f.region(), f.queueName(), f.queueType()],
  },
  'webhook': {
    criblType: 'webhook', label: 'Webhook', defaultConfig: {},
    fields: [f.url('', false, 'Webhook URL'), f.tls()],
  },
  'amazon security lake': {
    // Required: type, bucket, stagePath, region, accountId, customSource, assumeRoleArn
    criblType: 'security_lake', label: 'Amazon Security Lake', defaultConfig: {},
    fields: [
      f.region(),
      f.bucket('aws-security-data-lake-...'),
      f.stagePath('/tmp/cribl'),
      f.accountId(),
      f.customSource(),
      f.assumeRoleArn(),
    ],
  },
  'sumo logic': {
    // Required: type, url
    criblType: 'sumo_logic', label: 'Sumo Logic', defaultConfig: {},
    fields: [f.url('', true, 'Collector URL')],
  },
  'google chronicle': {
    // Required: type, logFormatType
    criblType: 'google_chronicle', label: 'Google Chronicle', defaultConfig: {},
    fields: [f.region('us'), f.customerId(), f.logFormatType()],
  },
  'cribl http': {
    criblType: 'cribl_http', label: 'Cribl HTTP', defaultConfig: {},
    fields: [f.url('', false, 'Cribl Worker URL'), f.tls()],
  },
  'azure sentinel': {
    // Required: type, endpointURLConfiguration, loginUrl, secret, client_id
    criblType: 'sentinel', label: 'Microsoft Sentinel', defaultConfig: { authType: 'oauth' },
    fields: [
      f.endpointURLConfiguration(),
      f.url('', false, 'DCE Endpoint URL'),
      f.loginUrl(),
      f.clientId(),
      f.secret('Client Secret'),
    ],
  },
  'microsoft sentinel': {
    criblType: 'sentinel', label: 'Microsoft Sentinel', defaultConfig: { authType: 'oauth' },
    fields: [
      f.endpointURLConfiguration(),
      f.url('', false, 'DCE Endpoint URL'),
      f.loginUrl(),
      f.clientId(),
      f.secret('Client Secret'),
    ],
  },
  'new relic': {
    criblType: 'newrelic', label: 'New Relic', defaultConfig: {},
    fields: [],
  },
  'crowdstrike': {
    // Required: type, format, url
    criblType: 'crowdstrike_next_gen_siem', label: 'CrowdStrike NG SIEM', defaultConfig: {},
    fields: [f.url('', true, 'Data Connector URL'), f.format('JSON'), f.token('Auth Token')],
  },
  'sentinel': {
    criblType: 'sentinel', label: 'Microsoft Sentinel', defaultConfig: { authType: 'oauth' },
    fields: [
      f.endpointURLConfiguration(),
      f.url('', false, 'DCE Endpoint URL'),
      f.loginUrl(),
      f.clientId(),
      f.secret('Client Secret'),
    ],
  },
  'ngsiem': {
    criblType: 'crowdstrike_next_gen_siem', label: 'CrowdStrike NG SIEM', defaultConfig: {},
    fields: [f.url('', true, 'Data Connector URL'), f.format('JSON'), f.token('Auth Token')],
  },
  'crowdstrike ngsiem': {
    criblType: 'crowdstrike_next_gen_siem', label: 'CrowdStrike NG SIEM', defaultConfig: {},
    fields: [f.url('', true, 'Data Connector URL'), f.format('JSON'), f.token('Auth Token')],
  },
  'crowdstrike ng siem': {
    criblType: 'crowdstrike_next_gen_siem', label: 'CrowdStrike NG SIEM', defaultConfig: {},
    fields: [f.url('', true, 'Data Connector URL'), f.format('JSON'), f.token('Auth Token')],
  },
  'newrelic': {
    criblType: 'newrelic', label: 'New Relic', defaultConfig: {},
    fields: [],
  },
  'splunk enterprise': {
    criblType: 'splunk', label: 'Splunk S2S', defaultConfig: {},
    fields: [f.destHost('localhost'), f.port(9997, true), f.tls()],
  },
  'splunk cloud': {
    criblType: 'splunk_hec', label: 'Splunk HEC', defaultConfig: {},
    fields: [f.url('https://input-prd.cloud.splunk.com:8088/services/collector/event', false, 'HEC URL'), f.token('HEC Token'), f.tls()],
  },
  'cribl stream': {
    criblType: 'cribl_http', label: 'Cribl HTTP', defaultConfig: {},
    fields: [f.url('', false, 'Cribl Worker URL'), f.tls()],
  },
  's3': {
    criblType: 's3', label: 'Amazon S3', defaultConfig: {},
    fields: [f.region(), f.bucket('my-s3-bucket'), f.stagePath('/tmp/cribl')],
  },
  'elastic': {
    criblType: 'elastic', label: 'Elasticsearch', defaultConfig: {},
    fields: [f.url('https://localhost:9200', false, 'Cluster URL'), f.index('main'), f.tls()],
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
      fields: mapping?.fields ?? [],
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
      fields: mapping?.fields ?? [],
    };
  });
}

/** Deduplicated list of known destination names for use in a dropdown. */
export const DESTINATION_OPTIONS: string[] = (() => {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const [, mapping] of Object.entries(DESTINATION_MAP)) {
    if (!seen.has(mapping.label)) {
      seen.add(mapping.label);
      options.push(mapping.label);
    }
  }
  return options.sort();
})();

/** Map from display label back to a DESTINATION_MAP key. */
export function destinationLabelToKey(label: string): string {
  const lower = label.toLowerCase().trim();
  // Direct match
  if (DESTINATION_MAP[lower]) return lower;
  // Match by label
  for (const [key, mapping] of Object.entries(DESTINATION_MAP)) {
    if (mapping.label.toLowerCase() === lower) return key;
  }
  return lower;
}

/** Build the API payload from field values.
 *  Special keys:
 *    _tls  → { tls: { disabled: false } }
 *    _brokers → brokers as comma-split array
 */
export function buildPayloadFromFields(
  base: { id: string; type: string; defaultConfig: Record<string, unknown> },
  fieldValues: Record<string, string | number | boolean>,
  isSource: boolean,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: base.id,
    type: base.type,
    ...base.defaultConfig,
  };

  if (isSource) {
    payload.disabled = true;
  }

  for (const [key, value] of Object.entries(fieldValues)) {
    if (value === '' || value === undefined) continue;

    if (key === '_tls') {
      if (value === true) payload.tls = { disabled: false };
      continue;
    }
    if (key === '_brokers') {
      payload.brokers = String(value).split(',').map((b) => b.trim()).filter(Boolean);
      continue;
    }

    payload[key] = value;
  }

  return payload;
}
