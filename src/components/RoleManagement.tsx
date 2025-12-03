import React, { useState, useEffect } from 'react';
import './RoleManagement.css';

interface Role {
  id: string;
  name: string;
  description?: string;
  userIds?: string[];
  groupIds?: string[];
  groups?: Array<{ id: string; name: string; displayName?: string }>;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  displayName?: string;
}

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    loadRoles();
    loadUsers();
    loadGroups();
  }, []);

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/roles', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Fel vid laddning av roller:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Fel vid laddning av användare:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Fel vid laddning av grupper:', error);
    }
  };

  const handleAssignUserToRole = async (userId: string, roleId: string) => {
    try {
      const response = await fetch('/api/users/' + userId + '/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ roleId }),
      });

      if (response.ok) {
        await loadRoles();
        if (selectedRole?.id === roleId) {
          const updatedRole = await fetch(`/api/roles/${roleId}`, {
            credentials: 'include',
          }).then(r => r.json());
          setSelectedRole(updatedRole);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte tilldela roll');
      }
    } catch (error) {
      console.error('Fel vid tilldelning av roll:', error);
      alert('Ett fel uppstod');
    }
  };

  const handleRemoveUserFromRole = async (userId: string, roleId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadRoleDetails(roleId);
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte ta bort roll');
      }
    } catch (error) {
      console.error('Fel vid borttagning av roll:', error);
      alert('Ett fel uppstod');
    }
  };

  const handleAssignGroupToRole = async (groupId: string, roleId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ roleId }),
      });

      if (response.ok) {
        await loadRoleDetails(roleId);
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte tilldela roll till grupp');
      }
    } catch (error) {
      console.error('Fel vid tilldelning av roll till grupp:', error);
      alert('Ett fel uppstod');
    }
  };

  const handleRemoveGroupFromRole = async (groupId: string, roleId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadRoleDetails(roleId);
      } else {
        const error = await response.json();
        alert(error.error || 'Kunde inte ta bort roll från grupp');
      }
    } catch (error) {
      console.error('Fel vid borttagning av roll från grupp:', error);
      alert('Ett fel uppstod');
    }
  };

  const roleUsers = selectedRole ? users.filter(u => selectedRole.userIds?.includes(u.id)) : [];
  const roleGroups = selectedRole ? groups.filter(g => selectedRole.groupIds?.includes(g.id)) : [];
  const availableUsers = selectedRole ? users.filter(u => !selectedRole.userIds?.includes(u.id)) : [];
  const availableGroups = selectedRole ? groups.filter(g => !selectedRole.groupIds?.includes(g.id)) : [];

  return (
    <div className="role-management">
      <div className="role-management-header">
        <h3>Rollhantering</h3>
        <p className="section-description">
          Knyt användare och grupper till roller. Användare och grupper med specifika roller tilldelas automatiskt aktiviteter när produkter skapas.
        </p>
      </div>

      <div className="role-management-content">
        <div className="roles-list-section">
          <h4>Roller</h4>
          <div className="roles-list">
            {roles.map((role) => (
              <div
                key={role.id}
                className={`role-card ${selectedRole?.id === role.id ? 'selected' : ''}`}
                onClick={() => setSelectedRole(role)}
              >
                <div className="role-card-header">
                  <h5>{role.name}</h5>
                </div>
                {role.description && (
                  <p className="role-card-description">{role.description}</p>
                )}
                <div className="role-card-stats">
                  <span>{role.userIds?.length || 0} användare</span>
                  <span>{role.groupIds?.length || 0} grupper</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedRole && (
          <div className="role-details-section">
            <h4>{selectedRole.name}</h4>
            {selectedRole.description && (
              <p className="role-description">{selectedRole.description}</p>
            )}

            <div className="role-assignments">
              <div className="assignment-section">
                <h5>Användare ({roleUsers.length})</h5>
                <div className="assignment-list">
                  {roleUsers.map((user) => (
                    <div key={user.id} className="assignment-item">
                      <span>{user.name} ({user.email})</span>
                      <button
                        className="btn-danger btn-small"
                        onClick={() => handleRemoveUserFromRole(user.id, selectedRole.id)}
                      >
                        Ta bort
                      </button>
                    </div>
                  ))}
                  {availableUsers.length > 0 && (
                    <select
                      className="add-assignment-select"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignUserToRole(e.target.value, selectedRole.id);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">Lägg till användare...</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="assignment-section">
                <h5>Grupper ({roleGroups.length})</h5>
                <div className="assignment-list">
                  {roleGroups.map((group) => (
                    <div key={group.id} className="assignment-item">
                      <span>{group.displayName || group.name}</span>
                      <button
                        className="btn-danger btn-small"
                        onClick={() => handleRemoveGroupFromRole(group.id, selectedRole.id)}
                      >
                        Ta bort
                      </button>
                    </div>
                  ))}
                  {availableGroups.length > 0 && (
                    <select
                      className="add-assignment-select"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignGroupToRole(e.target.value, selectedRole.id);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">Lägg till grupp...</option>
                      {availableGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.displayName || group.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

