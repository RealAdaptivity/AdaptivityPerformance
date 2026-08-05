/** Helpers for customer service addresses shown in dispatch / tech apps. */

/** Matches values like "15637, 76177" that look like coordinates but are house# + zip. */
export function isIncompleteServiceAddress(address: string | null | undefined): boolean {
  const t = (address || '').trim();
  if (!t) return true;
  // Pure lat,lng
  if (/^-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+$/.test(t)) return true;
  // House number + zip only (no street name)
  if (/^\d{1,6}\s*,\s*\d{5}(-\d{4})?$/.test(t)) return true;
  // Digits-only street fragment
  if (/^\d{1,6}$/.test(t)) return true;
  // Must include at least one letter (street name / city)
  if (!/[A-Za-z]/.test(t)) return true;
  return false;
}

export function formatServiceAddress(parts: {
  street: string;
  city?: string;
  state?: string;
  zip?: string;
}): string {
  const street = parts.street.trim();
  const city = (parts.city || '').trim();
  const state = (parts.state || 'TX').trim() || 'TX';
  const zip = (parts.zip || '').trim().replace(/\s+/g, '');

  let out = street;
  if (city && !new RegExp(`\\b${escapeRegExp(city)}\\b`, 'i').test(out)) {
    out = `${out}, ${city}`;
  }
  if (state && !new RegExp(`\\b${escapeRegExp(state)}\\b`, 'i').test(out)) {
    out = `${out}, ${state}`;
  }
  if (zip) {
    const zip5 = zip.slice(0, 5);
    if (!out.includes(zip5)) {
      out = `${out} ${zip5}`;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractZipFromAddress(address: string): string | null {
  const m = address.trim().match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}
