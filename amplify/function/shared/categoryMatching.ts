/**
 * Post-LLM normalization of free-text supplier categories into the canonical
 * enum used by the UI (badges, filters, dashboard aggregations — see
 * src/Components/Supplier/utils/formOptions.js and categoryAndStatus.js).
 *
 * The LLM prompt that normalizes import files lives in the separate
 * api-bafatorio repo and is out of reach here (ADR-027 follow-up). This is
 * the only place in BafatorioApp where a free-text category can be corrected
 * before it's persisted, so it tries, in order: exact canonical match, a
 * PT/EN/FR synonym dictionary, then a bounded Levenshtein fallback for typos.
 * If nothing matches with confidence it returns the original text uppercased
 * (the previous behaviour) rather than guessing — an unknown category still
 * renders fine via the hash-color fallback in categoryAndStatus.js.
 */

export const CANONICAL_SUPPLIER_CATEGORIES = [
  'CATERING',
  'AV',
  'VENUE',
  'DECORATION',
  'ENTERTAINMENT',
  'PHOTOGRAPHY',
  'VIDEOGRAPHY',
  'TRANSPORTATION',
  'FLOWERS',
  'CAKE',
  'WINE',
  'FOOD',
  'SERVICES',
] as const;

export type SupplierCategory = typeof CANONICAL_SUPPLIER_CATEGORIES[number];

// PT/EN/FR terms actually used in the product's translations
// (src/i18n/locales/{en-US,pt-PT,fr-FR}/supplier.json → categories.*) plus a
// few obvious variants. Keys must be pre-normalized (lowercase, no accents).
const SYNONYMS: Record<SupplierCategory, string[]> = {
  CATERING: ['catering', 'traiteur'],
  AV: ['av', 'audiovisual', 'audiovisuel', 'audio visual'],
  VENUE: ['venue', 'espaco', 'local', 'lieu', 'espace'],
  DECORATION: ['decoration', 'decor', 'decoracao', 'decoraco'],
  ENTERTAINMENT: ['entertainment', 'entretenimento', 'divertissement'],
  PHOTOGRAPHY: ['photography', 'fotografia', 'photographie', 'foto', 'photo'],
  VIDEOGRAPHY: ['videography', 'videografia', 'videographie', 'video'],
  TRANSPORTATION: ['transportation', 'transporte', 'transport'],
  FLOWERS: ['flowers', 'flores', 'fleurs', 'flor', 'fleur'],
  CAKE: ['cake', 'bolo', 'gateau'],
  WINE: ['wine', 'vinho', 'vinhos', 'vin', 'vins'],
  FOOD: ['food', 'comida', 'nourriture', 'alimentacao'],
  SERVICES: ['services', 'servico', 'servicos', 'service'],
};

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeText(value: string): string {
  return stripAccents(value.trim().toLowerCase()).replace(/\s+/g, ' ');
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z]+/)
    .filter((token) => token.length > 0);
}

/** Classic DP Levenshtein distance (edit distance). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j += 1) dist[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1, // deletion
        dist[i][j - 1] + 1, // insertion
        dist[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dist[rows - 1][cols - 1];
}

/** Distance threshold scales with the candidate's length to avoid false positives on short words. */
function fuzzyThreshold(length: number): number {
  if (length <= 7) return 1;
  if (length <= 11) return 2;
  return 3;
}

// Candidates shorter than this are too short for edit-distance matching to be
// meaningful (a distance of 1-2 covers a large fraction of the characters) —
// see categoryMatching.test.ts for the false positives this used to produce
// ("Moto Táxi" -> PHOTOGRAPHY via "foto", "Van" -> WINE via "vin", etc.). 5
// still let a narrower version through ("Vidro" -> VIDEOGRAPHY via "video",
// "Vocal" -> VENUE via "local", "Bateau" -> CAKE via "gateau" — issue #212).
const MIN_FUZZY_CANDIDATE_LENGTH = 7;
const MAX_TOKEN_CANDIDATE_LENGTH_DIFF = 1;

function findSynonymMatch(token: string): SupplierCategory | undefined {
  for (const category of CANONICAL_SUPPLIER_CATEGORIES) {
    if (normalizeText(category) === token || SYNONYMS[category].includes(token)) {
      return category;
    }
  }
  return undefined;
}

function findFuzzyMatch(token: string): SupplierCategory | undefined {
  let bestDistance = Infinity;
  let bestCategories = new Set<SupplierCategory>();

  for (const category of CANONICAL_SUPPLIER_CATEGORIES) {
    const candidates = [normalizeText(category), ...SYNONYMS[category]];
    for (const candidate of candidates) {
      if (candidate.length < MIN_FUZZY_CANDIDATE_LENGTH) continue;
      if (Math.abs(token.length - candidate.length) > MAX_TOKEN_CANDIDATE_LENGTH_DIFF) continue;

      const distance = levenshtein(token, candidate);
      if (distance > fuzzyThreshold(candidate.length)) continue;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestCategories = new Set([category]);
      } else if (distance === bestDistance) {
        bestCategories.add(category);
      }
    }
  }

  // Ambiguous: two different categories tied at the same best distance —
  // guessing which one is wrong more often than it's right, so decline.
  return bestCategories.size === 1 ? [...bestCategories][0] : undefined;
}

/**
 * Maps free-text supplier category input (as returned by the LLM normalize
 * step, or typed directly) to a canonical category. Falls back to the
 * trimmed/uppercased original text when no confident match is found.
 */
export function normalizeSupplierCategory(raw?: string | number | null): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;

  const fullNormalized = normalizeText(trimmed);

  const exact = findSynonymMatch(fullNormalized);
  if (exact) return exact;

  const tokenMatches: SupplierCategory[] = [];
  for (const token of tokenize(trimmed)) {
    const tokenMatch = findSynonymMatch(token);
    if (tokenMatch && !tokenMatches.includes(tokenMatch)) {
      tokenMatches.push(tokenMatch);
    }
  }
  if (tokenMatches.length > 0) {
    // SERVICES is a generic catch-all that shows up as filler ("serviços de
    // X") ahead of the specific category word — prefer any more specific
    // match found among the other tokens over it.
    const specific = tokenMatches.find((category) => category !== 'SERVICES');
    return specific ?? tokenMatches[0];
  }

  const fuzzyOnFull = findFuzzyMatch(fullNormalized);
  if (fuzzyOnFull) return fuzzyOnFull;

  for (const token of tokenize(trimmed)) {
    const tokenMatch = findFuzzyMatch(token);
    if (tokenMatch) return tokenMatch;
  }

  return trimmed.toUpperCase();
}
