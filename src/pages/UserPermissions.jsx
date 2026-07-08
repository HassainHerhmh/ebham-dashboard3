import { Fragment, useEffect, useMemo, useState } from 'react';
import { api, getStoredUser, storePlatformUser } from '../api';
import {
  getRoleLabel,
  permissionActions,
  permissionGroups,
  roleOptions,
} from '../config/permissions';
import {
  createEmptyPermissions,
  normalizePermissions,
  normalizeRole,
  saveStoredPermissions,
  toServerPermissions,
} from '../utils/permissions';

function getSectionKeys(sections) {
  return [...new Set(sections.map((section) => section.key))];
}

function updateCurrentUserPermissions(userId, role, permissions, onUserChange) {
  const current = getStoredUser();
  if (!current || String(current.id) !== String(userId)) return;
  const nextUser = { ...current, role, permissions };
  storePlatformUser(nextUser);
  onUserChange?.(nextUser);
}

export default function UserPermissions({ onUserChange }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [role, setRole] = useState('employee');
  const [permissions, setPermissions] = useState(() => createEmptyPermissions());
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');

  const selectedUser = useMemo(
    () => users.find((user) => String(user.id) === String(selectedUserId)) || null,
    [selectedUserId, users]
  );

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'all') return users;
    return users.filter((user) => normalizeRole(user.role) === roleFilter);
  }, [roleFilter, users]);

  useEffect(() => {
    api.getUsers()
      .then((list) => {
        setUsers(list || []);
        if (list?.length) setSelectedUserId(String(list[0].id));
      })
      .catch((err) => {
        setMsgType('error');
        setMsg(err.message || 'تعذر تحميل المستخدمين');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId('');
      return;
    }
    const visible = filteredUsers.some((user) => String(user.id) === String(selectedUserId));
    if (!visible) setSelectedUserId(String(filteredUsers[0].id));
  }, [filteredUsers, selectedUserId]);

  useEffect(() => {
    if (!selectedUser) return undefined;

    const userRole = normalizeRole(selectedUser.role) || 'employee';
    setRole(userRole);

    let cancelled = false;
    const loadPermissions = async () => {
      let nextPermissions = normalizePermissions(selectedUser.permissions);
      try {
        const response = await api.getUserPermissions(selectedUser.id);
        nextPermissions = normalizePermissions(response.permissions || nextPermissions);
        if (!cancelled) setRole(response.role || userRole);
      } catch {
        // fallback to user.permissions from list
      }
      if (!cancelled) setPermissions(nextPermissions);
    };

    loadPermissions();
    return () => { cancelled = true; };
  }, [selectedUser]);

  const togglePermission = (sectionKey, action) => {
    setPermissions((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        [action]: !current[sectionKey]?.[action],
      },
    }));
  };

  const setSectionPermissions = (sectionKey, value) => {
    setPermissions((current) => ({
      ...current,
      [sectionKey]: permissionActions.reduce((actions, item) => {
        actions[item.key] = value;
        return actions;
      }, {}),
    }));
  };

  const setSectionsPermissions = (sections, action, value) => {
    const sectionKeys = getSectionKeys(sections);
    setPermissions((current) => {
      const next = { ...current };
      sectionKeys.forEach((sectionKey) => {
        next[sectionKey] = { ...next[sectionKey], [action]: value };
      });
      return next;
    });
  };

  const setGroupPermissions = (sections, value) => {
    const sectionKeys = getSectionKeys(sections);
    setPermissions((current) => {
      const next = { ...current };
      sectionKeys.forEach((sectionKey) => {
        next[sectionKey] = permissionActions.reduce((actions, item) => {
          actions[item.key] = value;
          return actions;
        }, {});
      });
      return next;
    });
  };

  const areSectionsActionSelected = (sections, action) =>
    getSectionKeys(sections).every((sectionKey) => Boolean(permissions[sectionKey]?.[action]));

  const areSectionsFullySelected = (sections) =>
    getSectionKeys(sections).every((sectionKey) =>
      permissionActions.every((action) => Boolean(permissions[sectionKey]?.[action.key]))
    );

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        role,
        permissions: toServerPermissions(permissions),
      };
      const response = await api.saveUserPermissions(selectedUser.id, payload);
      const savedPermissions = normalizePermissions(response.permissions || permissions);
      saveStoredPermissions(selectedUser.id, savedPermissions);
      updateCurrentUserPermissions(selectedUser.id, response.role || role, savedPermissions, onUserChange);
      setUsers((current) => current.map((user) => (
        String(user.id) === String(selectedUser.id)
          ? { ...user, role: response.role || role, permissions: savedPermissions }
          : user
      )));
      setMsgType('info');
      setMsg('تم حفظ الصلاحيات بنجاح');
    } catch (err) {
      setMsgType('error');
      setMsg(err.message || 'فشل حفظ الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card text-center py-10">جاري تحميل المستخدمين...</div>;
  }

  return (
    <>
      {msg && (
        <div className={`toast ${msgType === 'error' ? 'toast--error' : 'toast--info'}`}>{msg}</div>
      )}

      <div className="page-header">
        <h2>صلاحيات المستخدمين</h2>
        <p>اختر المستخدم وحدد الصفحات والعمليات المسموحة له</p>
      </div>

      <div className="card mb-5">
        <div className="permissions-filters">
          <label className="permissions-filter-field">
            <span>فلترة حسب النوع</span>
            <select className="finance-filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">كل المستخدمين</option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="permissions-filter-field">
            <span>المستخدم</span>
            <select
              className="finance-filter-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} — {getRoleLabel(normalizeRole(user.role))}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card permissions-table-card">
        <div className="overflow-x-auto">
          <table className="permissions-table data-table">
            <thead>
              <tr>
                <th>الصفحة</th>
                {permissionActions.map((action) => (
                  <th key={action.key}>{action.label}</th>
                ))}
                <th>الكل</th>
              </tr>
            </thead>
            <tbody>
              {permissionGroups.map((group) => {
                const groupSections = group.children.length ? group.children : [];
                const isExpanded = Boolean(expandedGroups[group.key]);

                return (
                  <Fragment key={group.key}>
                    <tr className="permissions-group-row">
                      <td>
                        <button
                          type="button"
                          className="permissions-group-toggle"
                          onClick={() => setExpandedGroups((current) => ({
                            ...current,
                            [group.key]: !isExpanded,
                          }))}
                        >
                          <span>{isExpanded ? '⌄' : '‹'}</span>
                          <strong>{group.label}</strong>
                        </button>
                        <div className="permissions-group-hint">تحديد القسم كامل</div>
                      </td>
                      {permissionActions.map((action) => (
                        <td key={action.key} className="text-center">
                          <input
                            type="checkbox"
                            checked={areSectionsActionSelected(groupSections, action.key)}
                            onChange={(e) => setSectionsPermissions(groupSections, action.key, e.target.checked)}
                          />
                        </td>
                      ))}
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={areSectionsFullySelected(groupSections)}
                          onChange={(e) => setGroupPermissions(groupSections, e.target.checked)}
                        />
                      </td>
                    </tr>

                    {isExpanded && groupSections.map((section) => {
                      const sectionPermissions = permissions[section.key] || {};
                      const isAllSelected = permissionActions.every(
                        (action) => sectionPermissions[action.key]
                      );

                      return (
                        <tr key={`${group.key}-${section.key}`}>
                          <td>
                            <div className="permissions-section-label">{section.label}</div>
                            {section.path && <div className="permissions-section-path">{section.path}</div>}
                          </td>
                          {permissionActions.map((action) => (
                            <td key={action.key} className="text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(sectionPermissions[action.key])}
                                onChange={() => togglePermission(section.key, action.key)}
                              />
                            </td>
                          ))}
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={(e) => setSectionPermissions(section.key, e.target.checked)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button type="button" className="btn btn-primary" disabled={!selectedUser || saving} onClick={handleSave}>
          {saving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
        </button>
      </div>
    </>
  );
}
