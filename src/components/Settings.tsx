import React, { useState } from 'react';
import { useStore } from '../store/store';
import { ActivityTemplate } from '../types';
import { DatabaseSettings } from './DatabaseSettings';
import { AuthSettings } from './AuthSettings';
import { RolesAndGroups } from './RolesAndGroups';
import { Users } from './Users';
import { GS1Settings } from './GS1Settings';
import { GS1Validation } from './GS1Validation';
import { GS1Subscriptions } from './GS1Subscriptions';
import './Settings.css';

export const Settings: React.FC = () => {
  const { 
    templates, 
    updateTemplate, 
    createTemplate,
    deleteTemplate,
    roles,
    currentUser 
  } = useStore();
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.find((t) => t.isDefault)?.id || templates[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'templates' | 'roles-groups' | 'users' | 'database' | 'auth' | 'gs1' | 'gs1-validation' | 'gs1-subscriptions'>('templates');

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
          className={activeTab === 'roles-groups' ? 'active' : ''}
          onClick={() => setActiveTab('roles-groups')}
        >
          Roller & Grupper
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Användare
        </button>
        <button
          className={activeTab === 'database' ? 'active' : ''}
          onClick={() => setActiveTab('database')}
        >
          Databas
        </button>
        <button
          className={activeTab === 'auth' ? 'active' : ''}
          onClick={() => setActiveTab('auth')}
        >
          Inloggning
        </button>
        <button
          className={activeTab === 'gs1' ? 'active' : ''}
          onClick={() => setActiveTab('gs1')}
        >
          GS1
        </button>
      </div>

      {activeTab === 'templates' && (
      <div className="settings-content">
        <div className="settings-sidebar">
          <h3>Mallar</h3>
          <div className="template-list">
            {templates.map((template) => (
              <div key={template.id} className="template-list-item">
                <button
                  className={selectedTemplateId === template.id ? 'active' : ''}
                  onClick={() => setSelectedTemplateId(template.id)}
                  style={{ flex: 1, textAlign: 'left' }}
                >
                  {template.name}
                  {template.isDefault && <span className="badge info">Standard</span>}
                </button>
                {!template.isDefault && (
                  <button
                    className="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Är du säker på att du vill ta bort mallen "${template.name}"?`)) {
                        deleteTemplate(template.id);
                        // Om den borttagna mallen var vald, välj första tillgängliga
                        if (selectedTemplateId === template.id) {
                          const remainingTemplates = templates.filter(t => t.id !== template.id);
                          setSelectedTemplateId(remainingTemplates[0]?.id || remainingTemplates.find(t => t.isDefault)?.id || '');
                        }
                      }
                    }}
                    title="Ta bort mall"
                    style={{ marginLeft: 'var(--spacing-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                  >
                    ×
                  </button>
                )}
              </div>
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

      {activeTab === 'roles-groups' && (
        <div className="settings-content-full">
          <RolesAndGroups />
        </div>
      )}

      {activeTab === 'users' && (
        <div className="settings-content-full">
          <Users />
        </div>
      )}

      {activeTab === 'database' && (
        <div className="settings-content-full">
          <DatabaseSettings />
        </div>
      )}

      {activeTab === 'auth' && (
        <div className="settings-content-full">
          <AuthSettings />
        </div>
      )}

      {(activeTab === 'gs1' || activeTab === 'gs1-validation' || activeTab === 'gs1-subscriptions') && (
        <div className="settings-content-full">
          <div className="gs1-tabs">
            <button
              className={activeTab === 'gs1' ? 'active' : ''}
              onClick={() => setActiveTab('gs1')}
            >
              Inställningar
            </button>
            <button
              className={activeTab === 'gs1-validation' ? 'active' : ''}
              onClick={() => setActiveTab('gs1-validation')}
            >
              Validering
            </button>
            <button
              className={activeTab === 'gs1-subscriptions' ? 'active' : ''}
              onClick={() => setActiveTab('gs1-subscriptions')}
            >
              Prenumerationer
            </button>
          </div>
          {activeTab === 'gs1' && <GS1Settings />}
          {activeTab === 'gs1-validation' && <GS1Validation />}
          {activeTab === 'gs1-subscriptions' && <GS1Subscriptions />}
        </div>
      )}
    </div>
  );
};

