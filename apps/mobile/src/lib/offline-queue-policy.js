export function queueOwnerId(user) {
  return user?.id === undefined || user?.id === null || String(user.id).trim() === ''
    ? null
    : String(user.id);
}

export function stripQueuedCredentials(options = {}) {
  const { token: _token, ...safeOptions } = options || {};
  return safeOptions;
}

export function canSyncQueuedItem(item, currentUserId) {
  if (item?.blocked) return false;
  const owner = item?.ownerUserId;
  if (!owner || !currentUserId) return false;
  return String(owner) === String(currentUserId);
}

export function queueOwnershipError(item, currentUserId) {
  if (item?.blocked) return item.lastError || 'Požadavek je zablokovaný a vyžaduje ruční kontrolu.';
  if (!item?.ownerUserId) return 'Starší offline požadavek nemá uloženého vlastníka; nebyl automaticky odeslán.';
  if (!currentUserId) return 'Pro synchronizaci offline fronty se přihlaste ke stejnému účtu.';
  if (String(item.ownerUserId) !== String(currentUserId)) {
    return 'Offline požadavek patří jinému uživateli a nebyl odeslán.';
  }
  return null;
}
