/**
 * Normalizes business function and department names across the cockpit.
 * Ensures consistent matching between API, SQLite, and UI dropdowns.
 */
export function normalizeFunction(name?: string | null): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'all functions' || trimmed.toLowerCase() === 'all') {
    return '';
  }

  const lower = trimmed.toLowerCase();
  if (
    lower === 'eng & it' ||
    lower === 'engineering & it' ||
    lower === 'engineering' ||
    lower === 'eng' ||
    lower === 'it' ||
    lower === 'eng and it' ||
    lower === 'engineering and it'
  ) {
    return 'Engineering & IT';
  }

  if (
    lower === 'customer' ||
    lower === 'customer support' ||
    lower === 'support' ||
    lower === 'cust'
  ) {
    return 'Customer Support';
  }

  if (
    lower === 'sales' ||
    lower === 'sales & marketing' ||
    lower === 'marketing' ||
    lower === 'sales and marketing'
  ) {
    return 'Sales & Marketing';
  }

  if (
    lower === 'operations' ||
    lower === 'ops' ||
    lower === 'operation'
  ) {
    return 'Operations';
  }

  if (
    lower === 'finance' ||
    lower === 'fin' ||
    lower === 'finops'
  ) {
    return 'Finance';
  }

  return trimmed;
}

export const CANONICAL_FUNCTIONS = [
  'All Functions',
  'Customer Support',
  'Engineering & IT',
  'Finance',
  'Operations',
  'Sales & Marketing'
];

