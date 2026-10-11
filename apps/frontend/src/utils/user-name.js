export function userDisplayName(user) {
  if (!user) return 'Neznámý uživatel';
  const name = [user.firstName, user.lastName].map((part) => String(part || '').trim()).filter(Boolean).join(' ');
  return name || user.displayName || user.userName || user.authorName || user.email || user.userEmail || user.authorEmail || 'Neznámý uživatel';
}
