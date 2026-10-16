const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(['info', 'success', 'warning', 'critical', 'support', 'project']);

export function isValidNotificationUserId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function normalizeNotificationInput(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Tělo upozornění musí být objekt.' };
  }

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  const type = typeof input.type === 'string' ? input.type : 'info';
  const data = input.data === undefined ? {} : input.data;

  if (!title || title.length > 120) {
    return { ok: false, error: 'Nadpis musí mít 1 až 120 znaků.' };
  }
  if (body.length > 1000) {
    return { ok: false, error: 'Text upozornění může mít nejvýše 1000 znaků.' };
  }
  if (!ALLOWED_TYPES.has(type)) {
    return { ok: false, error: 'Neplatný typ upozornění.' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Data upozornění musí být objekt.' };
  }
  if (JSON.stringify(data).length > 2000) {
    return { ok: false, error: 'Doplňková data upozornění jsou příliš velká.' };
  }

  return { ok: true, value: { title, body, type, data } };
}
