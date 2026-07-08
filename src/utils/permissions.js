import { permissionActions, permissionSections } from '../config/permissions';

const ADMIN_ROLES = new Set(['admin']);

export function normalizeRole(role) {
  if (!role) return '';
  return String(role).toLowerCase();
}

function getStoredPermissions(userId) {
  if (!userId) return null;
  try {
    const stored = JSON.parse(localStorage.getItem('platform_user_permissions') || '{}');
    return stored[String(userId)] || null;
  } catch {
    return null;
  }
}

export function saveStoredPermissions(userId, permissions) {
  try {
    const stored = JSON.parse(localStorage.getItem('platform_user_permissions') || '{}');
    stored[String(userId)] = permissions;
    localStorage.setItem('platform_user_permissions', JSON.stringify(stored));
  } catch {
    // ignore
  }
}

export function hasPermission(user, section, action = 'view') {
  if (!user) return false;
  const role = normalizeRole(user.role);
  if (ADMIN_ROLES.has(role)) return true;

  const permissions = user.permissions || getStoredPermissions(user.id);
  const aliases = action === 'add'
    ? ['add', 'create']
    : action === 'create'
      ? ['create', 'add']
      : [action];

  return aliases.some((key) => Boolean(permissions?.[section]?.[key]));
}

export function createEmptyPermissions() {
  return permissionSections.reduce((acc, section) => {
    acc[section.key] = permissionActions.reduce((actions, item) => {
      actions[item.key] = false;
      return actions;
    }, {});
    return acc;
  }, {});
}

export function normalizePermissions(value) {
  const empty = createEmptyPermissions();
  if (!value) return empty;

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    permissionSections.forEach((section) => {
      permissionActions.forEach((action) => {
        const serverKey = action.key === 'add' ? 'create' : action.key;
        empty[section.key][action.key] = Boolean(
          parsed?.[section.key]?.[action.key] || parsed?.[section.key]?.[serverKey]
        );
      });
    });
  } catch {
    return empty;
  }

  return empty;
}

export function toServerPermissions(value) {
  return permissionSections.reduce((acc, section) => {
    acc[section.key] = permissionActions.reduce((actions, action) => {
      const serverKey = action.key === 'add' ? 'create' : action.key;
      actions[serverKey] = Boolean(value[section.key]?.[action.key]);
      return actions;
    }, {});
    return acc;
  }, {});
}

export function getFirstAccessiblePath(user) {
  if (!user) return '/';
  const match = permissionSections.find(
    (section) => section.path && hasPermission(user, section.key, 'view')
  );
  return match?.path || '/unauthorized';
}
