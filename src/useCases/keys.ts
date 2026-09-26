import type { PovDestination, PovSource } from '../types';

const SEP = '\u0001';

export function povSourceKey(source: PovSource): string {
  return `${source.dataType}${SEP}${source.source}`;
}

export function povDestinationKey(destination: PovDestination): string {
  return `${destination.siemSoa}${SEP}${destination.destination}`;
}

export function formatSourceLabel(source: PovSource): string {
  return `${source.dataType} (${source.source})`;
}

export function formatDestinationLabel(destination: PovDestination): string {
  return `${destination.siemSoa} (${destination.destination})`;
}

export function resolveSourceLabel(sources: PovSource[], key: string): string {
  const match = sources.find((source) => povSourceKey(source) === key);
  if (match) return formatSourceLabel(match);
  const [dataType, source] = key.split(SEP);
  return dataType && source ? `${dataType} (${source})` : key;
}

export function resolveDestinationLabel(destinations: PovDestination[], key: string): string {
  const match = destinations.find((destination) => povDestinationKey(destination) === key);
  if (match) return formatDestinationLabel(match);
  const [siemSoa, destination] = key.split(SEP);
  return siemSoa && destination ? `${siemSoa} (${destination})` : key;
}

export function toggleKey(keys: string[], key: string, checked: boolean): string[] {
  if (checked) {
    return keys.includes(key) ? keys : [...keys, key];
  }
  return keys.filter((item) => item !== key);
}
