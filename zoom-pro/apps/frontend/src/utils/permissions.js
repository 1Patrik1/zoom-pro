export function canAccess(user, roles = []) {
  if (!roles.length) return true;
  return roles.includes(user?.role);
}

export function getVisibleNav(user, navItems) {
  return navItems.filter((item) => canAccess(user, item.roles));
}
