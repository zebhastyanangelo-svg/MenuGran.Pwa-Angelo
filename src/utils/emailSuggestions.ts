interface EmailSuggestion {
  readonly original: string;
  readonly suggestion: string;
}

const COMMON_DOMAIN_TYPOS: Readonly<Record<string, string>> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotmial.com.mx': 'hotmail.com.mx',
  'hotmai.com.mx': 'hotmail.com.mx',
  'hotmil.com.mx': 'hotmail.com.mx',
  'outloook.com': 'outlook.com',
  'outlook.cm': 'outlook.com',
  'outlooko.com': 'outlook.com',
  'outhot.com': 'outlook.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yajoo.com': 'yahoo.com',
  'icloude.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'protonmial.com': 'protonmail.com',
  'protonmai.com': 'protonmail.com',
  'protonmail.co': 'protonmail.com',
};

const LEVENSHTEIN_THRESHOLD = 2;

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1).fill(0);
  const curr = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function suggestEmailDomain(email: string): EmailSuggestion | null {
  if (!isValidEmail(email)) {
    return null;
  }
  const [localPart, domain] = email.split('@');
  if (localPart === '' || domain === undefined) {
    return null;
  }
  const normalized = domain.toLowerCase();

  const knownTypo = COMMON_DOMAIN_TYPOS[normalized];
  if (knownTypo !== undefined) {
    return { original: domain, suggestion: `${localPart}@${knownTypo}` };
  }

  const knownDomains = Object.values(COMMON_DOMAIN_TYPOS);
  for (const known of knownDomains) {
    if (normalized === known) {
      return null;
    }
    if (levenshtein(normalized, known) <= LEVENSHTEIN_THRESHOLD) {
      return { original: domain, suggestion: `${localPart}@${known}` };
    }
  }
  return null;
}

export function requiresEmailConfirmation(
  user: { id: string; email_confirmed_at?: string | null; identities?: unknown[] | null } | null,
): boolean {
  if (user === null || user === undefined) {
    return true;
  }
  if (user.email_confirmed_at !== null && user.email_confirmed_at !== undefined) {
    return false;
  }
  if (Array.isArray(user.identities) && user.identities.length > 0) {
    return false;
  }
  return true;
}
