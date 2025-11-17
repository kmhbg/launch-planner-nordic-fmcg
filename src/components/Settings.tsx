import React, { useState } from 'react';
import { useStore } from '../store/store';
import { ActivityTemplate, Role } from '../types';
import { DatabaseSettings } from './DatabaseSettings';
import './Settings.css';

export const Settings: React.FC = () => {
  const { 
    templates, 
    updateTemplate, 
    createTemplate, 
    roles,
    addRole,
    updateRole,
    deleteRole,
    users,
    assignUserToRole,
    removeUserFromRole,
    currentUser 
  } = useStore();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.find((t) => t.isDefault)?.id || templates[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'templates' | 'roles' | 'users' | 'database'>('templates');

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="settings-unauthorized">
        <p>Du har inte behörighet att komma åt inställningar.</p>
      </div>
    );
  }

  const handleUpdateActivity = (activityId: string, updates: Partial<ActivityTemplate>) => {
    if (!selectedTemplate) return;
    const updatedActivities = selectedTemplate.activities.map((a) =>
      a.id === activityId ? { ...a, ...updates } : a
    );
    updateTemplate(selectedTemplateId, { activities: updatedActivities });
  };

  const handleAddActivity = () => {
    if (!selectedTemplate) return;
    const newActivity: ActivityTemplate = {
      id: `activity-${Date.now()}`,
      name: 'Ny aktivitet',
      description: '',
      weeksBeforeLaunch: -10,
      category: 'Övrigt',
      required: true,
      order: selectedTemplate.activities.length + 1,
    };
    updateTemplate(selectedTemplateId, {
      activities: [...selectedTemplate.activities, newActivity],
    });
  };

  const handleDeleteActivity = (activityId: string) => {
    if (!selectedTemplate) return;
    if (!confirm('Är du säker på att du vill ta bort denna aktivitet?')) return;
    updateTemplate(selectedTemplateId, {
      activities: selectedTemplate.activities.filter((a) => a.id !== activityId),
    });
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h2>Inställningar</h2>
        <p className="subtitle">Hantera mallar, roller och användare</p>
      </div>

      <div className="settings-tabs">
        <button
          className={activeTab === 'templates' ? 'active' : ''}
          onClick={() => setActiveTab('templates')}
        >
          Mallar
        </button>
        <button
          className={activeTab === 'roles' ? 'active' : ''}
          onClick={() => setActiveTab('roles')}
        >
          Roller
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Användare & Roller
        </button>
        <button
          className={activeTab === 'database' ? 'active' : ''}
          onClick={() => setActiveTab('database')}
        >
          Databas
        </button>
      </div>

      {activeTab === 'templates' && (
      <div className="settings-content">
        <div className="settings-sidebar">
          <h3>Mallar</h3>
          <div className="template-list">
            {templates.map((template) => (
              <button
                key={template.id}
                className={selectedTemplateId === template.id ? 'active' : ''}
                onClick={() => setSelectedTemplateId(template.id)}
              >
                {template.name}
                {template.isDefault && <span className="badge info">Standard</span>}
              </button>
            ))}
          </div>
          <button className="primary" onClick={() => {
            createTemplate({
              name: 'Ny mall',
              description: '',
              activities: [],
              isDefault: false,
            });
          }}>
            + Ny mall
          </button>
        </div>

        <div className="settings-main">
          {selectedTemplate ? (
            <>
              <div className="template-header">
                <div>
                  <h3>{selectedTemplate.name}</h3>
                  {selectedTemplate.description && (
                    <p className="template-description">{selectedTemplate.description}</p>
                  )}
                </div>
              </div>

              <div className="activities-editor">
                <div className="activities-editor-header">
                  <h4>Aktiviteter</h4>
                  <button className="primary" onClick={handleAddActivity}>
                    + Lägg till aktivitet
                  </button>
                </div>

                <div className="activities-list">
                  {selectedTemplate.activities
                    .sort((a, b) => a.weeksBeforeLaunch - b.weeksBeforeLaunch)
                    .map((activity) => (
                      <div key={activity.id} className="activity-editor-item">
                        <div className="activity-editor-fields">
                          <div className="form-group">
                            <label>Namn</label>
                            <input
                              type="text"
                              value={activity.name}
                              onChange={(e) =>
                                handleUpdateActivity(activity.id, { name: e.target.value })
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label>Beskrivning</label>
                            <input
                              type="text"
                              value={activity.description}
                              onChange={(e) =>
                                handleUpdateActivity(activity.id, { description: e.target.value })
                              }
                            />
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Veckor före lansering</label>
                              <input
                                type="number"
                                value={activity.weeksBeforeLaunch}
                                onChange={(e) =>
                                  handleUpdateActivity(activity.id, {
                                    weeksBeforeLaunch: parseInt(e.target.value),
                                  })
                                }
                              />
                            </div>
                            <div className="form-group">
                              <label>Kategori</label>
                              <input
                                type="text"
                                value={activity.category}
                                onChange={(e) =>
                                  handleUpdateActivity(activity.id, { category: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div className="form-group">
                            <label>Standard ansvarig roll</label>
                            <select
                              value={activity.defaultAssigneeRole || ''}
                              onChange={(e) =>
                                handleUpdateActivity(activity.id, {
                                  defaultAssigneeRole: e.target.value || undefined,
                                })
                              }
                            >
                              <option value="">Ingen (manuell tilldelning)</option>
                              {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                            <small style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                              Användare med denna roll tilldelas automatiskt när produkt skapas
                            </small>
                          </div>
                        </div>
                        <button
                          className="danger"
                          onClick={() => handleDeleteActivity(activity.id)}
                        >
                          Ta bort
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Välj en mall för att redigera</p>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'roles' && (
        <div className="settings-content-full">
          <div className="roles-section">
            <div className="section-header">
              <div>
                <h3>Roller</h3>
                <p className="section-description">
                  Hantera roller som kan tilldelas till användare. Roller används för automatisk tilldelning av aktiviteter.
                </p>
              </div>
              <button className="primary" onClick={() => {
                const name = prompt('Ange rollnamn:');
                if (name) {
                  const desc = prompt('Beskrivning (valfritt):') || '';
                  addRole({ name, description: desc });
                }
              }}>
                + Ny roll
              </button>
            </div>
            {roles.length === 0 ? (
              <div className="empty-state">
                <p>Inga roller skapade ännu. Skapa din första roll!</p>
              </div>
            ) : (
              <div className="roles-list">
                {roles.map((role) => (
                  <div key={role.id} className="role-item">
                    <div className="role-info">
                      <strong>{role.name}</strong>
                      {role.description && <p className="role-description">{role.description}</p>}
                    </div>
                    <div className="role-actions">
                      <button
                        className="secondary"
                        onClick={() => {
                          const name = prompt('Nytt namn:', role.name);
                          if (name) {
                            const desc = prompt('Beskrivning:', role.description || '');
                            updateRole(role.id, { name, description: desc || undefined });
                          }
                        }}
                      >
                        Redigera
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          if (confirm(`Ta bort roll "${role.name}"? Detta kommer också ta bort rollen från alla användare.`)) {
                            deleteRole(role.id);
                          }
                        }}
                      >
                        Ta bort
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="settings-content-full">
          <div className="users-section">
            <div className="section-header">
              <div>
                <h3>Användare och Rolltilldelningar</h3>
                <p className="section-description">
                  Tilldela roller till användare. Användare med specifika roller tilldelas automatiskt aktiviteter när produkter skapas.
                </p>
              </div>
            </div>
            {users.length === 0 ? (
              <div className="empty-state">
                <p>Inga användare hittades.</p>
              </div>
            ) : (
              <div className="users-list">
                {users.map((user) => (
                  <div key={user.id} className="user-item">
                    <div className="user-info">
                      <div className="user-header">
                        <strong>{user.name}</strong>
                        {user.role === 'admin' && (
                          <span className="badge info" style={{ marginLeft: 'var(--spacing-xs)' }}>Admin</span>
                        )}
                      </div>
                      <span className="user-email">{user.email}</span>
                      <div className="user-roles">
                        {user.assignedRoles.length > 0 ? (
                          <>
                            <span className="roles-label">Tilldelade roller:</span>
                            {user.assignedRoles.map((roleId) => {
                              const role = roles.find(r => r.id === roleId);
                              return role ? (
                                <span key={roleId} className="role-badge">
                                  {role.name}
                                  <button
                                    className="remove-role-btn"
                                    onClick={() => removeUserFromRole(user.id, roleId)}
                                    title="Ta bort roll"
                                  >
                                    ×
                                  </button>
                                </span>
                              ) : null;
                            })}
                          </>
                        ) : (
                          <span className="no-roles">Inga roller tilldelade</span>
                        )}
                      </div>
                    </div>
                    <div className="user-actions">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            assignUserToRole(user.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">Lägg till roll...</option>
                        {roles
                          .filter(r => !user.assignedRoles.includes(r.id))
                          .map(role => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="settings-content-full">
          <DatabaseSettings />
        </div>
      )}
    </div>
  );
};

