const ARRAY_FIELDS = [
  'users',
  'projects',
  'attendance',
  'logs',
  'invoices',
  'inventoryItems',
  'inventoryMovements',
  'collisions',
  'troubleshooting',
  'components',
  'allCompanies',
  'assignments',
  'chats',
  'projectGallery',
];

const EMPTY_SYNC_STATE = {
  company: {},
  users: [],
  projects: [],
  attendance: [],
  logs: [],
  invoices: [],
  inventoryItems: [],
  inventoryMovements: [],
  collisions: [],
  troubleshooting: [],
  components: [],
  consumables: {},
  allCompanies: [],
  assignments: [],
  chats: [],
  projectGallery: [],
};

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Normalizes the full-sync API response so UI components never receive
 * non-array values for collections they render with .map().
 * If one field is malformed, retain its previous valid value instead of
 * crashing the UI or discarding already loaded data.
 */
export function normalizeFullSync(payload, fallback = EMPTY_SYNC_STATE) {
  if (!isRecord(payload)) return fallback;

  const next = { ...EMPTY_SYNC_STATE, ...payload };

  for (const key of ARRAY_FIELDS) {
    next[key] = Array.isArray(payload[key])
      ? payload[key]
      : Array.isArray(fallback?.[key])
        ? fallback[key]
        : EMPTY_SYNC_STATE[key];
  }

  next.company = payload.company === null || isRecord(payload.company)
    ? payload.company
    : (isRecord(fallback?.company) ? fallback.company : EMPTY_SYNC_STATE.company);

  next.consumables = payload.consumables === null || isRecord(payload.consumables)
    ? payload.consumables
    : (isRecord(fallback?.consumables) ? fallback.consumables : EMPTY_SYNC_STATE.consumables);

  return next;
}
