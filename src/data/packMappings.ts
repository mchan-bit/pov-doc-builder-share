import type { PovSource, PovDestination, PovUseCases } from '../types';

export interface PackRecommendation {
  packId: string;
  displayName: string;
  description: string;
  reason: string;
}

interface DataTypeMapping {
  pattern: RegExp;
  packId: string;
  displayName: string;
  description: string;
}

const DATA_TYPE_PACK_MAP: DataTypeMapping[] = [
  {
    pattern: /windows\s*event/i,
    packId: 'cribl-windows-event-logs',
    displayName: 'Windows Event Logs',
    description: 'Parse, reduce, and route Windows Event Logs',
  },
  {
    pattern: /pan\s*firewall|palo\s*alto/i,
    packId: 'cribl-palo-alto-networks',
    displayName: 'Palo Alto Networks',
    description: 'Parse and optimize Palo Alto firewall logs',
  },
  {
    pattern: /crowdstrike|fdr/i,
    packId: 'cribl-crowdstrike-fdr',
    displayName: 'CrowdStrike FDR',
    description: 'Process CrowdStrike Falcon Data Replicator events',
  },
  {
    pattern: /cisco\s*asa/i,
    packId: 'cribl-cisco-asa',
    displayName: 'Cisco ASA',
    description: 'Parse and optimize Cisco ASA firewall logs',
  },
  {
    pattern: /cisco\s*ftd|firepower/i,
    packId: 'cribl-cisco-ftd',
    displayName: 'Cisco FTD',
    description: 'Parse and optimize Cisco Firepower Threat Defense logs',
  },
  {
    pattern: /cloudtrail/i,
    packId: 'cribl-aws-cloudtrail',
    displayName: 'AWS CloudTrail',
    description: 'Process and optimize AWS CloudTrail logs',
  },
  {
    pattern: /vpc\s*flow/i,
    packId: 'cribl-aws-vpc-flow-logs',
    displayName: 'AWS VPC Flow Logs',
    description: 'Parse and reduce AWS VPC Flow Logs',
  },
  {
    pattern: /office\s*365|o365|microsoft\s*365/i,
    packId: 'cribl-microsoft-o365',
    displayName: 'Microsoft O365',
    description: 'Process Microsoft Office 365 activity and service logs',
  },
  {
    pattern: /zscaler/i,
    packId: 'cribl-zscaler',
    displayName: 'Zscaler',
    description: 'Parse and optimize Zscaler NSS logs',
  },
  {
    pattern: /fortinet|fortigate/i,
    packId: 'cribl-fortinet-fortigate',
    displayName: 'Fortinet FortiGate',
    description: 'Parse and optimize FortiGate firewall logs',
  },
  {
    pattern: /checkpoint|check\s*point/i,
    packId: 'cribl-checkpoint',
    displayName: 'Check Point',
    description: 'Parse and optimize Check Point firewall logs',
  },
  {
    pattern: /linux\s*os/i,
    packId: 'cribl-linux-metrics',
    displayName: 'Linux Metrics',
    description: 'Collect and process Linux OS metrics',
  },
  {
    pattern: /aws\s*security\s*lake/i,
    packId: 'cribl-amazon-security-lake',
    displayName: 'Amazon Security Lake',
    description: 'Format and route data to Amazon Security Lake in OCSF',
  },
];

function dedup(recommendations: PackRecommendation[]): PackRecommendation[] {
  const seen = new Set<string>();
  return recommendations.filter((r) => {
    if (seen.has(r.packId)) return false;
    seen.add(r.packId);
    return true;
  });
}

export function getRecommendedPacks(
  sources: PovSource[],
  _destinations: PovDestination[],
  useCases: PovUseCases,
): PackRecommendation[] {
  const results: PackRecommendation[] = [];

  for (const source of sources) {
    for (const mapping of DATA_TYPE_PACK_MAP) {
      if (mapping.pattern.test(source.dataType)) {
        results.push({
          packId: mapping.packId,
          displayName: mapping.displayName,
          description: mapping.description,
          reason: `Source: ${source.dataType}`,
        });
      }
    }
  }

  if (useCases.searchAndAnalyze.enabled && useCases.searchAndAnalyze.autoDatatyping) {
    results.push({
      packId: 'cribl-search-datatypes',
      displayName: 'Search Datatypes',
      description: 'Auto-detect and classify data types for Cribl Search',
      reason: 'Use case: Auto Datatyping',
    });
  }

  return dedup(results);
}
