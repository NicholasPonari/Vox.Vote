import { GovernmentLevel } from './types/geo';

/**
 * Convert a district name to a URL-safe slug
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get the display label for a government level
 */
export function getLevelLabel(level: GovernmentLevel): string {
  switch (level) {
    case 'federal':
      return 'Federal';
    case 'provincial':
      return 'Provincial';
    case 'municipal':
      return 'Municipal';
  }
}

/**
 * Get the emoji icon for a government level
 */
export function getLevelIcon(level: GovernmentLevel): string {
  switch (level) {
    case 'federal':
      return '🏛️';
    case 'provincial':
      return '🏠';
    case 'municipal':
      return '📍';
  }
}

/**
 * Get the route prefix for a government level
 */
export function getLevelRoutePrefix(level: GovernmentLevel): string {
  return `/d/${level}`;
}

/**
 * Build a district URL
 */
export function getDistrictUrl(level: GovernmentLevel, name: string): string {
  return `${getLevelRoutePrefix(level)}/${toSlug(name)}`;
}

/**
 * Get the district field name for filtering issues
 */
export function getDistrictFieldName(level: GovernmentLevel): 'federal_district' | 'provincial_district' | 'municipal_district' {
  switch (level) {
    case 'federal':
      return 'federal_district';
    case 'provincial':
      return 'provincial_district';
    case 'municipal':
      return 'municipal_district';
  }
}
